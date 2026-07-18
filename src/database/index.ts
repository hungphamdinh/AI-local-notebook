import {open, type DB, type Scalar} from '@op-engineering/op-sqlite';
import {migration1} from './schema';
import {LocalNoteError} from '../types/errors';

const db: DB = open({name: 'localnote.sqlite'});

export const database = {
  async initialize(): Promise<void> {
    try {
      const statements = migration1
        .split(';')
        .map(statement => statement.trim())
        .filter(Boolean);
      await db.transaction(async transaction => {
        for (const statement of statements) {
          await transaction.execute(statement);
        }
        await transaction.execute(
          'INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(1, ?)',
          [new Date().toISOString()],
        );
      });
    } catch (cause) {
      throw new LocalNoteError('database_migration_failure', 'Local storage could not be prepared.', 'Restart the app. If it continues, reinstall the app.', false, cause);
    }
  },
  execute(sql: string, params: Scalar[] = []) { return db.execute(sql, params); },
  transaction: db.transaction.bind(db),
  interrupt: () => db.interrupt(),
};
