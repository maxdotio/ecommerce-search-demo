import fs from "fs";
import path from "path";
import express from "express";
import { Qdrant } from "qdrant";
import { MightyPool } from "node-mighty";
import { program } from "commander";

const DEFAULT_PORT = 3000;
program.option('-p, --port <port>', 'Specify the port number').parse(process.argv);
program.option('-e, --encoder-url <url>', 'Specify the URL for Mighty Encoder').parse(process.argv);
program.option('-c, --crossencoder-url <url>', 'Specify the URL for Mighty Crossencoder').parse(process.argv);
const port = program.port || DEFAULT_PORT;

///
/// Mighty & Qdrant Connections
///
const TOP_K = 24;
const COLLECTION = "esci";
const qdrant = new Qdrant("http://localhost:6333/");
const mighty_encoder = new MightyPool(["http://localhost:5050","http://localhost:5051","http://localhost:5052"],"sentence-transformers");
const mighty_crossencoder = new MightyPool(["http://localhost:5053","http://localhost:5054","http://localhost:5055"],"cross-encoding");


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
        let mighty_encoder_res = await mighty_encoder.get(querystring);
        if (mighty_encoder_res.err) {
            res.status(500).send(mighty_encoder_res.err);
        } else {
            let vector = mighty_encoder_res.response.outputs[0];
            let qdrant_res = await qdrant.query_collection(COLLECTION,{
                "vector":vector,
                "with_payload":true,
                "with_vector":false,
                "top":TOP_K,
                "params": {
                    "hnsw_ef": 128
                },
                "filter": {
                    "must": [
                        {
                            "key": "type",
                            "match": {
                                "value": "product"
                            }
                        }
                    ]
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

//Gets a crossencoding logits score for a query+doc pair, and adds it to the document
let crossencode = async function(querystring,doc) {
    let score = doc.score;
    let mighty_res = await mighty_crossencoder.get(querystring,doc.text);
    if (!mighty_res.err && mighty_res.response.logits && mighty_res.response.logits[0][0]) {
        score = mighty_res.response.logits[0][0];
    }
    doc.crossencoding = score;
    return doc;
}

app.post("/rerank", async function (req, res) {
    let querystring = req.query.search;
    let docs = req.body.documents;
    if(!querystring) {
        res.status(400).send({"message":"Empty search query!"});
    } else if(!docs) {
        res.status(400).send({"message":"Empty documents list!"});
    } else {
        //Loop through all the documents and get the query+document crossencoding score
        let encoded = await Promise.all(
          docs.map(async (doc) => {
            doc = await crossencode(querystring, doc);
            return doc;
          })
        );
        encoded.sort((a,b)=>b.crossencoding-a.crossencoding);
        res.send(encoded);
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

app.listen(port,"0.0.0.0");
console.log("Application listening on http://localhost:"+port);
