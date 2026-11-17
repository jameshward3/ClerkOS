import * as migration_20261117_213123_initial from './20261117_213123_initial';
import * as migration_20261117_224506_style_guide_conformance from './20261117_224506_style_guide_conformance';

export const migrations = [
  {
    up: migration_20261117_213123_initial.up,
    down: migration_20261117_213123_initial.down,
    name: '20261117_213123_initial',
  },
  {
    up: migration_20261117_224506_style_guide_conformance.up,
    down: migration_20261117_224506_style_guide_conformance.down,
    name: '20261117_224506_style_guide_conformance'
  },
];
