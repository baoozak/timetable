import { parseWeeks } from "../parser.js";

export default {
    id: "urp",
    name: "URP 综合教务系统",
    provider: `
        (function() {
            try {
                var table = document.getElementById('cwTable') || document.querySelector('.displayTag');
                if (!table) {
                    var tables = document.getElementsByTagName('table');
                    for (var i = 0; i < tables.length; i++) {
                        if (tables[i].innerHTML.indexOf('星期') !== -1) {
                            table = tables[i];
                            break;
                        }
                    }
                }
                
                if (!table) {
                    document.title = 'KEBIAO_ERR:未查找到URP课表表格';
                    return;
                }

                var trs = table.getElementsByTagName('tr');
                var courses = [];
                for (var i = 1; i < trs.length; i++) {
                    var tds = trs[i].getElementsByTagName('td');
                    for (var j = 0; j < tds.length; j++) {
                        var td = tds[j];
                        if (td.className === 'infoTitle') continue;
                        
                        var html = td.innerHTML.trim();
                        // 多个课程可能在同一个格子里，用换行或 hr 分隔
                        var courseTexts = html.split(/<br\\s*\\/?>|<hr\\s*\\/?>/gi);
                        var validTexts = courseTexts.map(t => t.replace(/<[^>]+>/g, '').trim()).filter(t => t);
                        
                        if (validTexts.length >= 3) {
                            var day = j; // 依赖跨行情况计算
                            courses.push([
                                validTexts[0].replace(/[~|]/g, ' '),
                                td.cellIndex > 0 ? td.cellIndex : (j+1),
                                (i * 2 - 1) + '-' + (i * 2),
                                (validTexts[2] || '').replace(/[~|]/g, ' '),
                                (validTexts[1] || '').replace(/[~|]/g, ' '),
                                (validTexts[3] || '').replace(/[~|]/g, ' ')
                            ].join('~'));
                        }
                    }
                }
                
                if (courses.length === 0) {
                    document.title = 'KEBIAO_ERR:未能提取到课程数据';
                } else {
                    document.title = 'KEBIAO_OK:' + courses.join('|');
                }
            } catch(e) {
                document.title = 'KEBIAO_ERR:' + e.message;
            }
        })();
    `,
    parser: function(compactStr) {
        const items = compactStr.split("|");
        const courses = [];
        let id = 0;
        for (const item of items) {
            const parts = item.split("~");
            if (parts.length < 3) continue;
            const [name, dayStr, jcsStr, room, weeksStr, teacher] = parts;
            const day = parseInt(dayStr);
            if (!day || day < 1 || day > 7) continue;

            const jcsMatch = jcsStr.match(/(\d+)-(\d+)/);
            let startNode = 1, endNode = 2;
            if (jcsMatch) {
                startNode = parseInt(jcsMatch[1]);
                endNode = parseInt(jcsMatch[2]);
            }

            const weeks = parseWeeks(weeksStr || "");
            
            courses.push({
                id: ++id,
                name: name || "未知课程",
                day,
                startNode,
                endNode,
                room: room || "",
                teacher: teacher || "",
                weeks,
                weeksText: weeksStr || ""
            });
        }
        return courses;
    }
}
