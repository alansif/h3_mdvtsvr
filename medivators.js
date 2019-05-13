const searchStrings = [
	{
		searchFor: /Machine serial number\s+:\s(.*)/,
		outputField: "MachineSerialNumber",
		chinese: "机器序列号"
	},
	{
		searchFor: /Location\s+:\s(.*)/,
		outputField: "Location",
		chinese: "位置"
	},
	{
		searchFor: /Endoscope\s+:\s(.*)/,
		outputField: "Endoscope",
		chinese: "内镜"
	},
	{
		searchFor: /Endoscope type\s+:\s(.*)/,
		outputField: "EndoscopeType",
		chinese: "内镜型号"
	},
	{
		searchFor: /Internal ID\s+:\s(.*)/,
		outputField: "InternalID",
		chinese: "内部ID"
	},
	{
		searchFor: /Serial number\s+:\s(.*)/,
		outputField: "SerialNumber",
		chinese: "序列号"
	},
	{
		searchFor: /Hookup\s+:\s(.*)/,
		outputField: "Hookup",
		chinese: "连接模块"
	},
	{
		searchFor: /Parameter set\s+:\s(.*)/,
		outputField: "ParameterSet",
		chinese: "参数设置"
	},
	{
		searchFor: /Cycle number\s+:\s(.*)/,
		outputField: "CycleNumber",
		chinese: "循环次数",
		converter: (n) => parseInt(n)
	},
	{
		searchFor: /Cycle completion date\s+:\s(.*)/,
		outputField: "CycleCompletionDate",
		chinese: "循环完成日期",
		converter: (d) => moment(d, "MM/DD/YYYY").format("YYYY-MM-DD")
	},
	{
		searchFor: /Operator loading\s+:\s(.*)/,
		outputField: "OperatorLoading",
		chinese: "操作者装载"
	},
	{
		searchFor: /Operator unloading\s+:\s(.*)/,
		outputField: "OperatorUnloading",
		chinese: "操作者卸载"
	},
	{
		searchFor: /MRC validation\s+:\s(.*)/,
		outputField: "MRCValidation",
		chinese: "浓度确认"
	},
	{
		searchFor: /CYCLE\s+:\s(.*)/,
		outputField: "CYCLE",
		chinese: "循环"
	},
	{
		searchFor: /TimeBegin/,
		outputField: "TimeBegin",
		chinese: "开始时间"
	},
	{
		searchFor: /TimeEnd/,
		outputField: "TimeEnd",
		chinese: "结束时间"
	}
];

const fs = require("fs");
const moment = require("moment");

function stage1(str) {
	const rgx_begin = /(\d+:[0-5]\d:[0-5]\d [A|P]M)\s+Endoscope disinfection/g;
	let result_begin = rgx_begin.exec(str);
	if (!result_begin) return null;
	let time_begin = moment(result_begin[1], "hh:mm:ss A").format("HH:mm:ss");
	let s00 = str.slice(0, result_begin.index);
	let s0 = str.slice(rgx_begin.lastIndex);
	const rgx_end = /(\d+:[0-5]\d:[0-5]\d [A|P]M)\s+Cycle end/;
	let result_end = rgx_end.exec(s0);
	if (!result_end) return null;
	let time_end = moment(result_end[1], "hh:mm:ss A").format("HH:mm:ss");
	let s1 = s0.slice(0, result_end.index);
	return {s00, time_begin, s1, time_end};
}

function stage2(s1) {
	let recs = [];
	const regex1 = /(\d+:[0-5]\d:[0-5]\d [A|P]M)\s+(\d+)(\.\d+)?\s+(.*)/g;
	while ((result = regex1.exec(s1)) != null)  {
		let obj = {time:moment(result[1], "hh:mm:ss A").format("HH:mm:ss"), step:result[2], info:result[4]};
		if (result[3]) obj.fail = result[3];
		recs.push(obj);
	}
	return recs;
}

function stage00(str) {
	let recs = {};
	searchStrings.forEach(e => {
		let r = str.match(e.searchFor);
		if (r) {
			const a = r[1].trimEnd();
			recs[e.outputField] = e.converter ? e.converter(a) : a;
		}
	})
	return recs;
}

function process(cycles) {
	let normalizedcs = cycles.map(c => c.replace(/\r\n\s/g, ' ')).filter(e => e.length > 0);
	let rcs = normalizedcs.map(e => {
		let r = stage1(e);
		if (!r) return undefined;
		let obj = stage00(r.s00);
		obj.TimeBegin = r.time_begin;
		obj.TimeEnd = r.time_end;
		obj.Steps = stage2(r.s1);
		return obj;
	}).filter(obj => !!obj);
	return rcs;
}

function parseFile(fn) {
	let data = fs.readFileSync(fn, "latin1");
	let str = data.toString();
	let cycles = str.split('\r\nDisinfection cycle log\r\n');
	let objs = process(cycles);
	return objs;
}

exports.parseFile = parseFile;
exports.fieldNames = searchStrings.reduce((acc,cur)=>{acc[cur.outputField]=cur.chinese;return acc;},{});
