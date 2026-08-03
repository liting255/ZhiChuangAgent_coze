import { relations } from "drizzle-orm/relations";
import { projects, papers, paperTerms, searchSessions, paperNotes } from "./schema";

export const papersRelations = relations(papers, ({one, many}) => ({
	project: one(projects, {
		fields: [papers.projectId],
		references: [projects.id]
	}),
	paperTerms: many(paperTerms),
	paperNotes: many(paperNotes),
}));

export const projectsRelations = relations(projects, ({many}) => ({
	papers: many(papers),
	searchSessions: many(searchSessions),
}));

export const paperTermsRelations = relations(paperTerms, ({one}) => ({
	paper: one(papers, {
		fields: [paperTerms.paperId],
		references: [papers.id]
	}),
}));

export const searchSessionsRelations = relations(searchSessions, ({one}) => ({
	project: one(projects, {
		fields: [searchSessions.projectId],
		references: [projects.id]
	}),
}));

export const paperNotesRelations = relations(paperNotes, ({one}) => ({
	paper: one(papers, {
		fields: [paperNotes.paperId],
		references: [papers.id]
	}),
}));