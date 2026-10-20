import { Metadata } from '@grpc/grpc-js';
import type { ClientGrpc } from '@nestjs/microservices';
import { createMock } from '@volontariapp/testing';
import { jest } from '@jest/globals';
import type { InternalMetadataProvider } from '../../clients/internal-metadata.provider.js';
import type { EventPostLinkClientWithMetadata } from '../../clients/interfaces/event-post-link-client-with-metadata.interface.js';
import type { InteractionClientWithMetadata } from '../../clients/interfaces/interaction-client-with-metadata.interface.js';
import type { PostClientWithMetadata } from '../../clients/interfaces/post-client-with-metadata.interface.js';
import type { RelationshipClientWithMetadata } from '../../clients/interfaces/relationship-client-with-metadata.interface.js';

/** Client gRPC dont getService renvoie le service mocke enregistre sous ce nom. */
export const createMockClientGrpc = (
  services: ReadonlyMap<string, object>,
): jest.Mocked<ClientGrpc> => {
  const client = createMock<ClientGrpc>();
  jest
    .spyOn(client, 'getService')
    .mockImplementation((name: string) => services.get(name) ?? {});
  return client;
};

/** Jeton interne : des metadonnees vides, sans signature. */
export const createMockInternalMetadata =
  (): jest.Mocked<InternalMetadataProvider> => {
    const provider = createMock<InternalMetadataProvider>();
    jest.spyOn(provider, 'get').mockResolvedValue(new Metadata());
    return provider;
  };

export const createMockRelationshipService =
  (): jest.Mocked<RelationshipClientWithMetadata> =>
    createMock<RelationshipClientWithMetadata>();
export const createMockInteractionService =
  (): jest.Mocked<InteractionClientWithMetadata> =>
    createMock<InteractionClientWithMetadata>();
export const createMockEventPostLinkService =
  (): jest.Mocked<EventPostLinkClientWithMetadata> =>
    createMock<EventPostLinkClientWithMetadata>();
export const createMockPostService = (): jest.Mocked<PostClientWithMetadata> =>
  createMock<PostClientWithMetadata>();
