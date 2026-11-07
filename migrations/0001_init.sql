CREATE TABLE rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,                        -- soft delete; NULL = active
  child_name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  attending INTEGER NOT NULL,             -- 1 yes, 0 no
  num_kids INTEGER NOT NULL DEFAULT 1,
  parents_staying INTEGER NOT NULL DEFAULT 0,
  food_preference TEXT NOT NULL DEFAULT '',
  allergies TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  key TEXT NOT NULL UNIQUE                -- lowercased child|parent, so re-submitting updates
);
