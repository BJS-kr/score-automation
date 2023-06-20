import { Injectable, OnModuleInit, PipeTransform } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { COMMAND_MODULE, RUN, TRANSFORM, UNDER_COMMAND } from './cmd.symbol';
import 'reflect-metadata';
import { OptionValues } from 'commander';

@Injectable()
export class CommandService implements OnModuleInit {
  private PARSED_OPTS: OptionValues;
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    this.PARSED_OPTS = this.reflector
      .get(COMMAND_MODULE, CommandService)
      .opts();

    this.discoveryService
      .getProviders()
      .filter(
        (wrapper) =>
          wrapper.isDependencyTreeStatic() &&
          wrapper.metatype &&
          this.reflector.get(UNDER_COMMAND, wrapper.metatype),
      )
      .forEach(({ instance }) => {
        this.scanner
          .getAllMethodNames(Object.getPrototypeOf(instance))
          .forEach((methodName) => {
            const isRun = this.reflector.get(RUN, instance[methodName]);

            if (isRun) {
              const transforms = this.reflector.get(
                TRANSFORM,
                instance[methodName],
              );

              const parsedArgs: any = transforms.length
                ? transforms.reduce(
                    (_: any, transform: PipeTransform) =>
                      transform.transform(this.PARSED_OPTS, {
                        type: 'custom',
                      }),
                    this.PARSED_OPTS,
                  )
                : this.PARSED_OPTS;

              const cmdArgs = this.reflector.get(methodName, instance);

              const constructedArgs = cmdArgs.reduce(
                (cmdObj: any, cmdArg: string) => {
                  cmdObj[cmdArg] = parsedArgs[cmdArg];

                  return cmdObj;
                },
                {},
              );

              instance[methodName](constructedArgs);
            }
          });
      });
  }
}