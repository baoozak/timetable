import { parseWeeks } from "../parser.js";

// 南软教务系统 (South Software) 解析器
// 常用于部分广东及南方地区的大学
export default {
    id: "south_soft",
    name: "南软教务系统",
    provider: `
        (function() {
            try {
                // 南软的系统往往是一个大 table, th 代表节次，td 是课程
                var table = document.querySelector('table.tb_kcb') || document.getElementById('kbtable');
                if (!table) {
                    var tables = document.getElementsByTagName('table');
                    for (var i = 0; i < tables.length; i++) {
                        if (tables[i].innerHTML.indexOf('星期') !== -1 || tables[i].innerHTML.indexOf('节次') !== -1) {
                            table = tables[i]; break;
                        }
                    }
                }
                if (!table) return void (document.title = 'KEBIAO_ERR:未能定位南软课表');

                var courses = [];
                var trs = table.getElementsByTagName('tr');
                for (var i = 1; i < trs.length; i++) {
                    var tds = trs[i].getElementsByTagName('td');
                    for (var j = 0; j < tds.length; j++) {
                        var html = tds[j].innerHTML;
                        if (!html || html === '&nbsp;') continue;
                        
                        var sections = html.split(/<hr\\s*\\/?>|<br\\s*\\/?>=============|<div class="kbcontent">/i);
                        for (var k = 0; k < sections.length; k++) {
                            var chunks = sections[k].split(/<br\\s*\\/?>|<p[^>]*>|<div>/i)
                                .map(v => v.replace(/<[^>]+>/g, '').trim())
                                .filter(v => v);

                            if (chunks.length >= 3) {
                                var day = tds[j].cellIndex || j + 1;
                                var start = (i * 2 - 1);
                                courses.push([
                                    chunks[0], day, start + '-' + (start + 1),
                                    chunks[2] || '', // 一般第3个是教室
                                    chunks[1] || '', // 获取周数，可能在第2个
                                    chunks[3] || ''  // 老师
                                ].join('~'));
                            }
                        }
                    }
                }
                
                document.title = courses.length ? 'KEBIAO_OK:HTML|' + courses.join('|') : 'KEBIAO_ERR:未能提取南软教务课程';
            } catch(e) { document.title = 'KEBIAO_ERR:' + e.message; }
        })();
    `,
    parser: function(compactStr) {
        if (compactStr.startsWith('JSON|')) return [];
        compactStr = compactStr.replace('HTML|', '');
        const items = compactStr.split("|");
        const courses = [];
        items.forEach((item, index) => {
            const parts = item.split("~");
            if (parts.length < 3) return;
            const [name, dayStr, jcsStr, room, weeksStr, teacher] = parts;
            const jcsMatch = jcsStr.match(/(\d+)-(\d+)/);
            let startNode = 1, endNode = 2;
            if (jcsMatch) {
                startNode = parseInt(jcsMatch[1]);
                endNode = parseInt(jcsMatch[2]);
            }
            courses.push({
                id: index + 1, name: name || "南软课程", day: parseInt(dayStr) || 1, startNode, endNode,
                room: room || "", teacher: teacher || "",
                weeks: parseWeeks(weeksStr || ""), weeksText: weeksStr || ""
            });
        });
        return courses;
    }
}
