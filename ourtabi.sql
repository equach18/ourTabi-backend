\echo 'Delete and recreate ourtabi db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE IF EXISTS ourtabi;
CREATE DATABASE ourtabi;
\connect ourtabi

\i ourtabi-schema.sql

\echo 'Delete and recreate ourtabi_test db?'
\prompt 'Return for yes or control-C to cancel > ' foo

DROP DATABASE IF EXISTS ourtabi_test;
CREATE DATABASE ourtabi_test;
\connect ourtabi_test

\i ourtabi-schema.sql