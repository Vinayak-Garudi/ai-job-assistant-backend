exports.up = (knex) =>
  knex.schema.createTable('applications', (t) => {
    t.bigIncrements('id').primary();
    t.string('user_id').notNullable(); // Mongo _id stored as a string
    t.string('company').notNullable();
    t.string('role').notNullable();
    t.string('job_url');
    t.integer('match_score');
    t.string('status').defaultTo('applied');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['user_id', 'status']); // speeds up dashboard filtering
  });

exports.down = (knex) => knex.schema.dropTable('applications');
