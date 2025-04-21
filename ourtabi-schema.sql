CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(25) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL CHECK (
        email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    profile_pic TEXT,
    bio TEXT,
    is_admin BOOLEAN DEFAULT FALSE
);

-- CREATE TABLE friend (
--     sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     status TEXT CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     PRIMARY KEY (sender_id, recipient_id)
-- );
CREATE TABLE friend (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (sender_id, recipient_id)
);

CREATE TABLE trip (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    destination TEXT NOT NULL,
    radius INTEGER CHECK (radius >= 0),
    start_date DATE,
    end_date DATE,
    is_private BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creator_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- CREATE TABLE trip_member (
--     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
--     trip_id INTEGER NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
--     role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
--     joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     PRIMARY KEY (user_id, trip_id)
-- );

CREATE TABLE trip_member (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id INTEGER NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, trip_id)
);

CREATE TABLE activity (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT CHECK (
        category IN (
            'food',
            'hiking',
            'tours',
            'shopping',
            'adventure',
            'outdoors',
            'other'
        )
    ) DEFAULT 'other',
    description TEXT,
    location TEXT,
    scheduled_time TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vote (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_id INTEGER NOT NULL REFERENCES activity(id) ON DELETE CASCADE,
    vote_value INTEGER CHECK (vote_value IN (-1, 0, 1)) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, activity_id)
);

CREATE TABLE comment (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_id INTEGER NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);