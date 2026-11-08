import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function budgetEnvironment(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('../drizzle/0000_provider_budget.sql',import.meta.url),'utf8'));
 return {GOOGLE_FREE_ALLOWANCE_CONFIRMED:'true',PROVIDER_BUDGET_DB:{prepare(sql){return {bind(...args){return {async first(){return sqlite.prepare(sql).get(...args)??null}}}}}}};
}
