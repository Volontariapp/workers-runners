import { Global, Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import {
  GRPC_MICROSERVICES,
  getGrpcOptions,
} from '@volontariapp/contracts-nest';
import { config } from '../../config/runtime-config.js';
import { EVENT_PACKAGE, POST_PACKAGE, SOCIAL_PACKAGE } from './constants.js';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SOCIAL_PACKAGE,
        useFactory: () =>
          getGrpcOptions(
            GRPC_MICROSERVICES.SOCIAL,
            config.microServices.msSocialUrl,
          ),
      },
      {
        name: EVENT_PACKAGE,
        useFactory: () =>
          getGrpcOptions(
            GRPC_MICROSERVICES.EVENT,
            config.microServices.msEventUrl,
          ),
      },
      {
        name: POST_PACKAGE,
        useFactory: () =>
          getGrpcOptions(
            GRPC_MICROSERVICES.POST,
            config.microServices.msPostUrl,
          ),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GrpcClientModule {}
