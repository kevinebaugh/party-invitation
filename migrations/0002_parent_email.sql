-- Optional contact email, used as the Reply-To on RSVP notification emails.
ALTER TABLE rsvps ADD COLUMN parent_email TEXT NOT NULL DEFAULT '';
