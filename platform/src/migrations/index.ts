import * as migration_20261117_213123_initial from './20261117_213123_initial';

export const migrations = [
  {
    up: migration_20261117_213123_initial.up,
    down: migration_20261117_213123_initial.down,
    name: '20261117_213123_initial'
  },
];
