import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,check} from 'drizzle-orm/sqlite-core';
export const providerBudget=sqliteTable('provider_budget',{
 scope:text('scope').primaryKey().notNull(),
 searches:integer('searches').notNull().default(0)
},table=>[check('provider_budget_searches_check',sql`${table.searches} >= 0 AND ${table.searches} <= 500`)]);
