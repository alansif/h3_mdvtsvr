const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 8665;
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "*");
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

const mysql = require('mysql');
const util = require('util');
const fs = require('fs');
const path = require('path');
const parser = require('./medivators');

const filepath = 'C:/Users/Administrator/Desktop/huasan/182';

const getFileIds = () => {
    let files = fs.readdirSync(filepath)
    	.filter(fn => fn.startsWith("SerialPlugin.dat"))
	    .map(fn => parseInt(fn.slice(16)));
    return files;
};

const conn = mysql.createConnection({
    host:       '192.168.160.90',
    user:       'root',
    password:   '1234',
    database:   'mdvt_schema'
});

const query = util.promisify(conn.query).bind(conn);

const go = async() => {
    try {
        const rows = await query('select max(fileId) from mdvt');
        const n = rows.length > 0 ? rows[0]['max(fileId)'] : 0;
        const fids = getFileIds().filter(fid => fid > 1557628432992);
        fids.forEach(fid => {
            const fn = path.join(filepath, 'SerialPlugin.dat' + fid);
            const objs = parser.parseFile(fn);
            objs.forEach(obj => {
                obj.Steps = JSON.stringify(obj.Steps);
                obj.fileId = fid;

                (async() => {
                    const r1 = await query('insert into mdvt set ?', obj);
                    console.log(r1);
                })();

            });
        });
    } finally {
        conn.end();
    }
};

//go();

app.get('/api/v1/query', function(req, res) {
    let f = async function() {
        try{
            const rows = await query('select * from mdvt');
            res.status(200).json(rows);
        } catch(err) {
            res.status(500).end();
            console.error(err);
        }
    };
    f();
});

app.listen(port, () => {
    console.log("Server is running on port " + port + "...");
});