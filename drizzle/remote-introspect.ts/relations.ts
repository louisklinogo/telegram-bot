import { relations } from "drizzle-orm/relations";
import {
  teams,
  clients,
  orders,
  measurements,
  communicationAccounts,
  communicationThreads,
  users,
  instagramContacts,
  whatsappContacts,
  communicationMessages,
  invoices,
  transactionAllocations,
  transactions,
  invoiceItems,
  orderItems,
  messageAttachments,
  bankStatements,
  communicationOutbox,
  messageDelivery,
  usersOnTeam,
  userInvites,
  activities,
  notificationSettings,
  bankStatementLines,
  bankStatementAllocations,
  appointments,
  communicationTemplates,
  documents,
  transactionCategories,
  tags,
  transactionTags,
  transactionAttachments,
} from "./schema";

export const clientsRelations = relations(clients, ({ one, many }) => ({
  team: one(teams, {
    fields: [clients.teamId],
    references: [teams.id],
  }),
  orders: many(orders),
  measurements: many(measurements),
  communicationThreads: many(communicationThreads),
  appointments: many(appointments),
  documents: many(documents),
  transactions: many(transactions),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  clients: many(clients),
  orders: many(orders),
  measurements: many(measurements),
  communicationAccounts: many(communicationAccounts),
  communicationThreads: many(communicationThreads),
  communicationMessages: many(communicationMessages),
  users: many(users),
  invoices: many(invoices),
  bankStatements: many(bankStatements),
  communicationOutboxes: many(communicationOutbox),
  usersOnTeams: many(usersOnTeam),
  userInvites: many(userInvites),
  whatsappContacts: many(whatsappContacts),
  instagramContacts: many(instagramContacts),
  activities: many(activities),
  notificationSettings: many(notificationSettings),
  appointments: many(appointments),
  communicationTemplates: many(communicationTemplates),
  documents: many(documents),
  transactionCategories: many(transactionCategories),
  tags: many(tags),
  transactionTags: many(transactionTags),
  transactions: many(transactions),
  transactionAttachments: many(transactionAttachments),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  team: one(teams, {
    fields: [orders.teamId],
    references: [teams.id],
  }),
  invoices: many(invoices),
  orderItems: many(orderItems),
  documents: many(documents),
  transactions: many(transactions),
}));

export const measurementsRelations = relations(measurements, ({ one, many }) => ({
  client: one(clients, {
    fields: [measurements.clientId],
    references: [clients.id],
  }),
  measurement: one(measurements, {
    fields: [measurements.previousVersionId],
    references: [measurements.id],
    relationName: "measurements_previousVersionId_measurements_id",
  }),
  measurements: many(measurements, {
    relationName: "measurements_previousVersionId_measurements_id",
  }),
  team: one(teams, {
    fields: [measurements.teamId],
    references: [teams.id],
  }),
}));

export const communicationAccountsRelations = relations(communicationAccounts, ({ one, many }) => ({
  team: one(teams, {
    fields: [communicationAccounts.teamId],
    references: [teams.id],
  }),
  communicationThreads: many(communicationThreads),
  communicationOutboxes: many(communicationOutbox),
}));

export const communicationThreadsRelations = relations(communicationThreads, ({ one, many }) => ({
  communicationAccount: one(communicationAccounts, {
    fields: [communicationThreads.accountId],
    references: [communicationAccounts.id],
  }),
  user: one(users, {
    fields: [communicationThreads.assignedUserId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [communicationThreads.customerId],
    references: [clients.id],
  }),
  instagramContact: one(instagramContacts, {
    fields: [communicationThreads.instagramContactId],
    references: [instagramContacts.id],
  }),
  team: one(teams, {
    fields: [communicationThreads.teamId],
    references: [teams.id],
  }),
  whatsappContact: one(whatsappContacts, {
    fields: [communicationThreads.whatsappContactId],
    references: [whatsappContacts.id],
  }),
  communicationMessages: many(communicationMessages),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  communicationThreads: many(communicationThreads),
  team: one(teams, {
    fields: [users.currentTeamId],
    references: [teams.id],
  }),
  usersOnTeams: many(usersOnTeam),
  userInvites: many(userInvites),
  activities: many(activities),
  notificationSettings: many(notificationSettings),
  appointments: many(appointments),
  documents: many(documents),
  transactions: many(transactions),
  transactionAttachments: many(transactionAttachments),
}));

export const instagramContactsRelations = relations(instagramContacts, ({ one, many }) => ({
  communicationThreads: many(communicationThreads),
  team: one(teams, {
    fields: [instagramContacts.teamId],
    references: [teams.id],
  }),
}));

export const whatsappContactsRelations = relations(whatsappContacts, ({ one, many }) => ({
  communicationThreads: many(communicationThreads),
  team: one(teams, {
    fields: [whatsappContacts.teamId],
    references: [teams.id],
  }),
}));

export const communicationMessagesRelations = relations(communicationMessages, ({ one, many }) => ({
  team: one(teams, {
    fields: [communicationMessages.teamId],
    references: [teams.id],
  }),
  communicationThread: one(communicationThreads, {
    fields: [communicationMessages.threadId],
    references: [communicationThreads.id],
  }),
  messageAttachments: many(messageAttachments),
  messageDeliveries: many(messageDelivery),
}));

export const transactionAllocationsRelations = relations(transactionAllocations, ({ one }) => ({
  invoice: one(invoices, {
    fields: [transactionAllocations.invoiceId],
    references: [invoices.id],
  }),
  transaction: one(transactions, {
    fields: [transactionAllocations.transactionId],
    references: [transactions.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  transactionAllocations: many(transactionAllocations),
  invoiceItems: many(invoiceItems),
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
  team: one(teams, {
    fields: [invoices.teamId],
    references: [teams.id],
  }),
  documents: many(documents),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  transactionAllocations: many(transactionAllocations),
  bankStatementAllocations: many(bankStatementAllocations),
  transactionTags: many(transactionTags),
  user: one(users, {
    fields: [transactions.assignedId],
    references: [users.id],
  }),
  transactionCategory: one(transactionCategories, {
    fields: [transactions.teamId],
    references: [transactionCategories.teamId],
  }),
  client: one(clients, {
    fields: [transactions.clientId],
    references: [clients.id],
  }),
  invoice: one(invoices, {
    fields: [transactions.invoiceId],
    references: [invoices.id],
  }),
  order: one(orders, {
    fields: [transactions.orderId],
    references: [orders.id],
  }),
  team: one(teams, {
    fields: [transactions.teamId],
    references: [teams.id],
  }),
  transactionAttachments: many(transactionAttachments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  orderItem: one(orderItems, {
    fields: [invoiceItems.orderItemId],
    references: [orderItems.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  invoiceItems: many(invoiceItems),
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  communicationMessage: one(communicationMessages, {
    fields: [messageAttachments.messageId],
    references: [communicationMessages.id],
  }),
}));

export const bankStatementsRelations = relations(bankStatements, ({ one, many }) => ({
  team: one(teams, {
    fields: [bankStatements.teamId],
    references: [teams.id],
  }),
  bankStatementLines: many(bankStatementLines),
}));

export const communicationOutboxRelations = relations(communicationOutbox, ({ one }) => ({
  communicationAccount: one(communicationAccounts, {
    fields: [communicationOutbox.accountId],
    references: [communicationAccounts.id],
  }),
  team: one(teams, {
    fields: [communicationOutbox.teamId],
    references: [teams.id],
  }),
}));

export const messageDeliveryRelations = relations(messageDelivery, ({ one }) => ({
  communicationMessage: one(communicationMessages, {
    fields: [messageDelivery.messageId],
    references: [communicationMessages.id],
  }),
}));

export const usersOnTeamRelations = relations(usersOnTeam, ({ one }) => ({
  team: one(teams, {
    fields: [usersOnTeam.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [usersOnTeam.userId],
    references: [users.id],
  }),
}));

export const userInvitesRelations = relations(userInvites, ({ one }) => ({
  user: one(users, {
    fields: [userInvites.invitedBy],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [userInvites.teamId],
    references: [teams.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  team: one(teams, {
    fields: [activities.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  team: one(teams, {
    fields: [notificationSettings.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [notificationSettings.userId],
    references: [users.id],
  }),
}));

export const bankStatementLinesRelations = relations(bankStatementLines, ({ one, many }) => ({
  bankStatement: one(bankStatements, {
    fields: [bankStatementLines.statementId],
    references: [bankStatements.id],
  }),
  bankStatementAllocations: many(bankStatementAllocations),
}));

export const bankStatementAllocationsRelations = relations(bankStatementAllocations, ({ one }) => ({
  bankStatementLine: one(bankStatementLines, {
    fields: [bankStatementAllocations.lineId],
    references: [bankStatementLines.id],
  }),
  transaction: one(transactions, {
    fields: [bankStatementAllocations.transactionId],
    references: [transactions.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  client: one(clients, {
    fields: [appointments.clientId],
    references: [clients.id],
  }),
  user: one(users, {
    fields: [appointments.staffUserId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [appointments.teamId],
    references: [teams.id],
  }),
}));

export const communicationTemplatesRelations = relations(communicationTemplates, ({ one }) => ({
  team: one(teams, {
    fields: [communicationTemplates.teamId],
    references: [teams.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
  invoice: one(invoices, {
    fields: [documents.invoiceId],
    references: [invoices.id],
  }),
  order: one(orders, {
    fields: [documents.orderId],
    references: [orders.id],
  }),
  team: one(teams, {
    fields: [documents.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const transactionCategoriesRelations = relations(transactionCategories, ({ one, many }) => ({
  transactionCategory: one(transactionCategories, {
    fields: [transactionCategories.parentId],
    references: [transactionCategories.id],
    relationName: "transactionCategories_parentId_transactionCategories_id",
  }),
  transactionCategories: many(transactionCategories, {
    relationName: "transactionCategories_parentId_transactionCategories_id",
  }),
  team: one(teams, {
    fields: [transactionCategories.teamId],
    references: [teams.id],
  }),
  transactions: many(transactions),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  team: one(teams, {
    fields: [tags.teamId],
    references: [teams.id],
  }),
  transactionTags: many(transactionTags),
}));

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
  tag: one(tags, {
    fields: [transactionTags.tagId],
    references: [tags.id],
  }),
  team: one(teams, {
    fields: [transactionTags.teamId],
    references: [teams.id],
  }),
  transaction: one(transactions, {
    fields: [transactionTags.transactionId],
    references: [transactions.id],
  }),
}));

export const transactionAttachmentsRelations = relations(transactionAttachments, ({ one }) => ({
  team: one(teams, {
    fields: [transactionAttachments.teamId],
    references: [teams.id],
  }),
  transaction: one(transactions, {
    fields: [transactionAttachments.transactionId],
    references: [transactions.id],
  }),
  user: one(users, {
    fields: [transactionAttachments.uploadedBy],
    references: [users.id],
  }),
}));
