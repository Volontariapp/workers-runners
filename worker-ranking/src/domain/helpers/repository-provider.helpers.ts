import type { Provider } from '@nestjs/common';
import { PostgresProvider } from '@volontariapp/bridge';
import type { EntityTarget, ObjectLiteral, Repository } from 'typeorm';

/** Un depot de domain-ranking, construit sur le depot TypeORM de la source de donnees du worker. */
export const repositoryProvider = <TModel extends ObjectLiteral, TRepository>(
  repository: new (typeormRepository: Repository<TModel>) => TRepository,
  model: EntityTarget<TModel>,
): Provider => ({
  provide: repository,
  useFactory: (postgres: PostgresProvider): TRepository =>
    new repository(postgres.getDriver().getRepository(model)),
  inject: [PostgresProvider],
});
