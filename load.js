//
// Formats and loads vector files into Qdrant as points
//

import fs from "fs";
import progress from "progress";
import { v4 as uuidv4} from "uuid";
import { Qdrant } from "qdrant";
import { program } from "commander";

//Qdrant Client
const qdrant = new Qdrant("http://localhost:6333/");

program
  .option('-f, --files <string>')
  .option('-n, --name <string>')
  .parse();

const options = program.opts();

function clean_filename(filename) {
    return filename.replace(/[:\/]+/g,'_')
}

let vector_files = null;

if (!options.files) {
    if (!options.sitemap) {
        console.error("You must specify the path to the vector files OR a sitemap.xml url!")
        program.help();
        process.exit(1);
    } else {
        vector_files = `vectors/${clean_filename(options.sitemap)}/`;
    }
} else {
    vector_files = options.files;
}

if (!options.name) {
    console.error("You must specify the site name!")
    program.help();
    process.exit(1);
}

//Globals
const site = options.name //"outdoors";
const ignore_fields = ["vectors","texts","entailed","paragraphs","context","body"];
const batch_size = 10;

//Index name and schema
const name = options.name;

function get_files(path) {
    let files = [];
    let filenames = fs.readdirSync(path);
    for(var j=0;j<filenames.length;j++) {
        if(filenames[j].indexOf(".json")>0) {
            files.push({
                "filename":path + filenames[j],
            });
        }
    }
    return files;
}

let id = 0;

function get_documents(files,ignore) {
    let payloads = [];
    let documents = [];

    for (var i=0;i<files.length;i++) {
        let doc = JSON.parse(fs.readFileSync(files[i].filename,"utf-8"));
        if (doc && doc && doc.vectors && doc.vectors.length) {

            //Qdrant doesn't accept true/false - convert to an int.
            doc.IsAccepted = doc.IsAccepted?1:0;

            //Construct the metadata parent for all sub-points.
            let metadata = {};
            for(var key in doc) {
                if (doc.hasOwnProperty(key) && (ignore.indexOf(key.toLowerCase())<0)) {
                    metadata[key] = doc[key];
                }
            }

            //For each vector and text pair, create a Qdrant point that we will eventually send to the search engine
            if(doc.vectors && doc.vectors.length && doc.texts && doc.texts.length) {
                for(var j=0;j<doc.vectors.length;j++) {
                    let vec = doc.vectors[j];
                    let txt = doc.texts[j];
                    //Each document body might have been split up if it was long.
                    //We'll create a separate point for each part of the vectorized content.
                    let docid = uuidv4();

                    let payload = JSON.parse(JSON.stringify(metadata));
                    payload.text = txt.replace(/[\n]/g,"<br/>");
                    payload.site = site;

                    //Add it to the main list to be batched later
                    documents.push({
                        "id":docid,
                        "vector":vec,
                        "payload":payload
                    });

                    id++;
                    
                }
            }
        }
    }

    return documents;
}

//Get and transform the files into Qdrant load-able points.
let files = get_files(vector_files);

let bar = new progress("Indexing [:bar] :percent remaining::etas elapsed::elapsed (:current/:total)", {complete: "=", incomplete: " ", width: 50, total: parseInt(files.length/batch_size)+1});
for(var p=0;p<files.length;p+=batch_size) {
    let filebatch = files.slice(p,p+batch_size);
    //let batch = documents.slice(p,p+batch_size);
    let batch = get_documents(filebatch,ignore_fields);
    if (batch.length) {
        try {
            let response = await qdrant.upload_points(name,batch);
        } catch(ex) {
            console.log("error in "+filebatch.join(","));
        }
    }
    bar.tick();
}