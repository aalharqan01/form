import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const fitnessAccounts = sqliteTable('fitness_accounts', {
  userId: text('user_id').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

// Coaching records are separate from the trainee-owned fitness log.
export const coachProfiles = sqliteTable('coach_profiles', {
  userId: text('user_id').primaryKey(),
  profile: text('profile').notNull(),
  revision: integer('revision').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});
export const coachWorkoutTemplates = sqliteTable('coach_workout_templates', {
  id: text('id').primaryKey(),
  coachId: text('coach_id').notNull(),
  routine: text('routine').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
export const coachingMemberships = sqliteTable('coaching_memberships', {
  id: text('id').primaryKey(),
  coachId: text('coach_id').notNull(),
  traineeId: text('trainee_id'),
  email: text('email').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().default('invited'),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  offer: text('offer').notNull(),
  intake: text('intake').notNull().default('{}'),
  program: text('program').notNull().default('null'),
  nutrition: text('nutrition').notNull().default('null'),
  revision: integer('revision').notNull().default(0),
  coachReadAt: text('coach_read_at').notNull().default(''),
  traineeReadAt: text('trainee_read_at').notNull().default(''),
  createdAt: text('created_at').notNull(),
  acceptedAt: text('accepted_at'),
  endedAt: text('ended_at'),
  openKey: text('open_key').unique(),
  decidedAt: text('decided_at'),
  decisionNote: text('decision_note').notNull().default(''),
});
export const coachingMessages = sqliteTable('coaching_messages', {
  id: text('id').primaryKey(),
  membershipId: text('membership_id').notNull(),
  senderId: text('sender_id').notNull(),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
  mediaId: text('media_id'),
});
// Uploaded images and short videos shared inside one coaching membership.
export const coachingMedia = sqliteTable(
  'coaching_media',
  {
    id: text('id').primaryKey(),
    membershipId: text('membership_id').notNull(),
    ownerId: text('owner_id').notNull(),
    kind: text('kind').notNull(),
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('coaching_media_membership').on(table.membershipId)],
);
export const progressPhotos = sqliteTable(
  'progress_photos',
  {
    id: text('id').primaryKey(),
    membershipId: text('membership_id').notNull(),
    ownerId: text('owner_id').notNull(),
    mediaId: text('media_id').notNull(),
    view: text('view').notNull(),
    takenOn: text('taken_on').notNull(),
    note: text('note').notNull().default(''),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('progress_photos_membership').on(table.membershipId, table.takenOn),
  ],
);
export const coachingCheckins = sqliteTable('coaching_checkins', {
  id: text('id').primaryKey(),
  membershipId: text('membership_id').notNull(),
  week: text('week').notNull(),
  answers: text('answers').notNull(),
  feedback: text('feedback').notNull().default(''),
  createdAt: text('created_at').notNull(),
  reviewedAt: text('reviewed_at'),
});
