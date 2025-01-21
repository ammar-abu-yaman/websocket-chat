#!/usr/bin/env node
import 'source-map-support/register';
import { App, Environment } from 'aws-cdk-lib'
import { NetworkStack, ServiceStack } from '../lib/stack'

const env: Environment = {
    account: process.env.ACCOUNT_ID,
    region: process.env.REGION ?? 'me-south-1',
}

const app = new App();

const networkStack = new NetworkStack(app, 'network-stack', { env })

const serviceStack = new ServiceStack(app, 'service-stack', { env, vpc: networkStack.vpc })
serviceStack.addDependency(networkStack)

app.synth()