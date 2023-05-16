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
  .option('-n, --name <string>')
  .parse();

const options = program.opts();

if (!options.name) {
    console.error("You must specify the site name!")
    program.help();
    process.exit(1);
}

//Index name and schema
const name = options.name;
const schema = {
    "name":name,
    "vectors": {
      "size": 384,
      "distance": "Cosine",
        "hnsw_config": {
            "ef_construct":512,
            "m":16
        }
    }
};

async function delete_collection() {
    let delete_result = await qdrant.delete_collection(name);
    console.log(delete_result);
}

//Make a new collection
async function create_collection() {
    let create_result = await qdrant.create_collection(name,schema);
    console.log(create_result);
}

//Delete the collection!
await delete_collection();

//Create the collection!
await create_collection();