import { parseWeeks } from "../parser.js";

export default {
    id: "kingosoft",
    name: "金智教务系统",
    provider: `
        (function() {
            try {
                var table = document.getElementById('kbtable') || document.querySelector('table.kbtable');
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
                    document.title = 'KEBIAO_ERR:未查找到金智课表表格';
                    return;
                }

                var trs = table.getElementsByTagName('tr');
                var courses = [];
                for (var i = 1; i < trs.length; i++) {
                    var tds = trs[i].getElementsByTagName('td');
                    // 首列是节次，后面的列是星期一到日
                    for (var j = 0; j < tds.length; j++) {
                        var td = tds[j];
                        var html = td.innerHTML.trim();
                        if (html === '' || html === '&nbsp;') continue;
                        
                        var sections = html.split(/<br(?:\\s*\\/?)>|-----------------------/g);
                        var currentCourse = [];
                        for (var k = 0; k < sections.length; k++) {
                            var text = sections[k].replace(/<[^>]+>/g, '').trim();
                            if (text) currentCourse.push(text);
                            
                            // 每一门课大约有3-4个字段
                            if (currentCourse.length >= 3 && (k === sections.length - 1 || sections[k] === '')) {
                                // 推测各个字段
                                var cName = currentCourse[0];
                                var cTeacher = '';
                                var cWeeks = '';
                                var cRoom = '';
                                
                                for (var p = 1; p < currentCourse.length; p++) {
                                    var item = currentCourse[p];
                                    if (item.indexOf('周') !== -1) cWeeks = item;
                                    else if (item.indexOf('教师') !== -1 || currentCourse.length === 3 && p === 1) cTeacher = item;
                                    else cRoom = item;
                                }
                                
                                var day = td.cellIndex; // 修正列号计算
                                if (day > 0 && day <= 7) {
                                    courses.push([
                                        cName.replace(/[~|]/g, ' '),
                                        day,
                                        (i * 2 - 1) + '-' + (i * 2), // 粗略估算节次：每行代表两节课
                                        cRoom.replace(/[~|]/g, ' '),
                                        cWeeks.replace(/[~|]/g, ' '),
                                        cTeacher.replace(/[~|]/g, ' ')
                                    ].join('~'));
                                }
                                currentCourse = [];
                            }
                        }
                    }
                }
                
                if (courses.length === 0) {
                    document.title = 'KEBIAO_ERR:未能提取到格式正确的课程数据';
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
