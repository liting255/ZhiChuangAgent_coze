import { pgTable, index, foreignKey, varchar, text, integer, jsonb, boolean, timestamp, serial } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const papers = pgTable("papers", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	projectId: varchar("project_id", { length: 36 }).notNull(),
	title: text().notNull(),
	authors: text(),
	abstract: text(),
	doi: varchar({ length: 255 }),
	url: text(),
	source: varchar({ length: 50 }),
	publishYear: integer("publish_year"),
	triageLevel: varchar("triage_level", { length: 20 }),
	triageReason: text("triage_reason"),
	relevanceScore: integer("relevance_score"),
	qualityScore: integer("quality_score"),
	confidence: varchar({ length: 10 }).default('medium'),
	aiSummary: text("ai_summary"),
	methodsSummary: text("methods_summary"),
	dataSummary: text("data_summary"),
	conclusionsSummary: text("conclusions_summary"),
	limitationsSummary: text("limitations_summary"),
	tags: jsonb(),
	isConfirmed: boolean("is_confirmed").default(false),
	isDeduplicated: boolean("is_deduplicated").default(false),
	searchSessionId: varchar("search_session_id", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	evidence: jsonb(),
	processingStatus: varchar("processing_status", { length: 20 }).default('pending'),
	humanConfirmed: boolean("human_confirmed").default(false),
}, (table) => [
	index("papers_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("papers_doi_idx").using("btree", table.doi.asc().nullsLast().op("text_ops")),
	index("papers_is_confirmed_idx").using("btree", table.isConfirmed.asc().nullsLast().op("bool_ops")),
	index("papers_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("papers_triage_level_idx").using("btree", table.triageLevel.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "papers_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const paperTerms = pgTable("paper_terms", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	paperId: varchar("paper_id", { length: 36 }).notNull(),
	term: varchar({ length: 255 }).notNull(),
	originalContext: text("original_context"),
	translation: text(),
	explanation: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("paper_terms_paper_id_idx").using("btree", table.paperId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.paperId],
			foreignColumns: [papers.id],
			name: "paper_terms_paper_id_papers_id_fk"
		}).onDelete("cascade"),
]);

export const projects = pgTable("projects", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	researchQuestion: text("research_question"),
	status: varchar({ length: 20 }).default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("projects_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("projects_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const searchSessions = pgTable("search_sessions", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	projectId: varchar("project_id", { length: 36 }).notNull(),
	queryText: text("query_text").notNull(),
	expandedQueries: jsonb("expanded_queries"),
	searchMode: varchar("search_mode", { length: 20 }).notNull(),
	booleanQuery: text("boolean_query"),
	resultCount: integer("result_count").default(0),
	stage: varchar({ length: 20 }).default('discovery'),
	evidenceSufficient: boolean("evidence_sufficient"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("search_sessions_project_id_idx").using("btree", table.projectId.asc().nullsLast().op("text_ops")),
	index("search_sessions_stage_idx").using("btree", table.stage.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "search_sessions_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const paperNotes = pgTable("paper_notes", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	paperId: varchar("paper_id", { length: 36 }).notNull(),
	content: text().notNull(),
	noteType: varchar("note_type", { length: 20 }).default('comment'),
	confirmed: boolean().default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("paper_notes_paper_id_idx").using("btree", table.paperId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.paperId],
			foreignColumns: [papers.id],
			name: "paper_notes_paper_id_papers_id_fk"
		}).onDelete("cascade"),
]);
