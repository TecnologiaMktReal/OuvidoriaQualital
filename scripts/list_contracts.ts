import * as db from '../server/db';
import dotenv from 'dotenv';
dotenv.config();

async function list() {
  try {
    const contracts = await db.getAllContracts({ pageSize: 1000 });
    console.log(JSON.stringify(contracts.map(x => ({id: x.id, state: x.state, name: x.name}))));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

list();


