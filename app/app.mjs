import fs from "fs";
import path from "path";
import express from "express";
import { Qdrant } from "qdrant";
import { MightyPool } from "node-mighty";


///
/// Mighty & Qdrant Connections
///
const TOP_K = 24;
const COLLECTION = "esci";
const qdrant = new Qdrant("http://localhost:6333/");
const mighty = new MightyPool(["http://localhost:5050","http://localhost:5051","http://localhost:5052","http://localhost:5053"],"sentence-transformers");

///
/// Express routes
///
let app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(".", "static")));

app.get("/", function (req, res) {
    res.sendFile(path.join(".", "static","index.html"));
});

app.get("/testui", function (req, res) {
    res.sendFile(path.join(".", "static","index2.html"));
});

app.get("/search", async function (req, res) {
    let querystring = req.query.search;
    if(!querystring) {
        res.status(400).send({"message":"Empty search query!"});
    } else {
        let mighty_res = await mighty.get(querystring);
        if (mighty_res.err) {
            res.status(500).send(mighty_res.err);
        } else {
            let vector = mighty_res.response.outputs[0];
            let qdrant_res = await qdrant.query_collection(COLLECTION,{
                "vector":vector,
                "with_payload":true,
                "with_vector":false,
                "top":TOP_K,
                "params": {
                    "hnsw_ef": 128
                }
            });
            if (qdrant_res.err) {
                res.status(500).send(qdrant_res.err);
            } else {
                let results = qdrant_res.response.result;
                res.send(results);
            }
        }
    }
});

app.get("/echo", async function (req, res) {
    const timestamp = new Date().toISOString();
    const ipAddress = req.ip;
    const querystring = req.query.search;
    const logObject = {ts: timestamp,ip: ipAddress,q: querystring};
    console.log(JSON.stringify(logObject));
    res.sendStatus(200);
});

app.listen(80,"0.0.0.0");
console.log("Application listening on http://localhost:80");
