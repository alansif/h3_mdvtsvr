const searchStrings = [
	{
		searchFor: /Machine serial number\s+:\s(.*)/,
		outputField: "MachineSerialNumber",
		chinese: "设备序列号"
	},
	{
		searchFor: /Location\s+:\s(.*)/,
		outputField: "Location",
		chinese: "位置"
	},
	{
		searchFor: /Endoscope\s+:\s(.*)/,
		outputField: "Endoscope",
		chinese: "内镜编号"
	},
	{
		searchFor: /Endoscope type\s+:\s(.*)/,
		outputField: "EndoscopeType",
		chinese: "内镜型号"
	},
	{
		searchFor: /Internal ID\s+:\s(.*)/,
		outputField: "InternalID",
		chinese: "内镜ID"
	},
	{
		searchFor: /Serial number\s+:\s(.*)/,
		outputField: "SerialNumber",
		chinese: "内镜序列号"
	},
	{
		searchFor: /Hookup\s+:\s(.*)/,
		outputField: "Hookup",
		chinese: "清洗接头"
	},
	{
		searchFor: /Parameter set\s+:\s(.*)/,
		outputField: "ParameterSet",
		chinese: "清洗程序"
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
		chinese: "装入操作人"
	},
	{
		searchFor: /Operator unloading\s+:\s(.*)/,
		outputField: "OperatorUnloading",
		chinese: "取出操作人"
	},
	{
		searchFor: /MRC validation\s+:\s(.*)/,
		outputField: "MRCValidation",
		chinese: "消毒液浓度测试"
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
	},
	{
		searchFor: /Category/,
		outputField: "Category",
		chinese: "洗消分类"
	}
];

const fs = require("fs");
const moment = require("moment");

function stage1(str) {
	const rgx_begin = /(\d+:[0-5]\d:[0-5]\d [A|P]M)\s+Endoscope disinfection/g;
	let result_begin = rgx_begin.exec(str);
	if (!result_begin){
		const rgx_begin1 = /(\d+:[0-5]\d:[0-5]\d [A|P]M)\s+Water line disinfect/g;
		result_begin = rgx_begin1.exec(str);
		if (!result_begin) return null;
	}
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

function process(cycles, c) {
	let normalizedcs = cycles.map(c => c.replace(/\r\n\s/g, ' ')).filter(e => e.length > 0);
	let rcs = normalizedcs.map(e => {
		let r = stage1(e);
		if (!r) return undefined;
		let obj = stage00(r.s00);
		obj.Category = c;
		obj.TimeBegin = r.time_begin;
		obj.TimeEnd = r.time_end;
		let rr = stage2(r.s1);
		rr.push({time:r.time_end, step:'', info:'循环结束'});
		obj.Steps = rr;
		return obj;
	}).filter(obj => !!obj);
	return rcs;
}

const category = [["Disinfection cycle log","内镜洗消"], ["Water line disinfect cycle log","自洗消"]];

function parseFile(fn) {
	let data = fs.readFileSync(fn, "latin1");
	let str = data.toString();
	for (const c of category) {
		let index = str.indexOf(c[0]);
		if (index !== -1) {
			let cycles = str.split('\r\n' + c[0] + '\r\n');
			let objs = process(cycles, c[1]);
			return objs;
		}
	}
	return [];
}

exports.parseFile = parseFile;
exports.fieldNames = searchStrings.reduce((acc,cur)=>{acc[cur.outputField]=cur.chinese;return acc;},{});
