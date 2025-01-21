import { Duration, Fn, Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2'
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns'
import { ApplicationProtocol, Protocol } from 'aws-cdk-lib/aws-elasticloadbalancingv2'
import {
    AwsLogDriverMode,
    Cluster,
    Compatibility,
    ContainerDefinition,
    ContainerImage,
    LogDriver, NetworkMode, TaskDefinition,
} from 'aws-cdk-lib/aws-ecs'
import { AnyPrincipal, Role } from 'aws-cdk-lib/aws-iam'
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets'


export interface ServiceStackProps extends StackProps {
    vpc: Vpc
}

export class ServiceStack extends Stack {

    private readonly service: ApplicationLoadBalancedFargateService

    constructor(scope: Construct, id: string, private props: ServiceStackProps) {
        super(scope, id, props)

        this.service = this.createService()
    }

    private createService() {
        const serviceRole = new Role(this, 'service-role', {
            assumedBy: new AnyPrincipal(),
        })

        const taskDefinition = new TaskDefinition(this, 'ui-task-def', {
            networkMode: NetworkMode.AWS_VPC,
            taskRole: serviceRole,
            compatibility: Compatibility.EC2_AND_FARGATE,
            memoryMiB: '8192',
            cpu: '4096',
        })

        const webContainer = new ContainerDefinition(this, 'web-container', {
            image: ContainerImage.fromDockerImageAsset(
                new DockerImageAsset(this, 'web-asset', { directory: '../webserver' })),
            taskDefinition,
            containerName: 'web',
            portMappings: [{ containerPort: 80 }],
            memoryLimitMiB: 2048,
            cpu: 1024,
            logging: LogDriver.awsLogs({ mode: AwsLogDriverMode.BLOCKING, streamPrefix: 'WebContainer' }),
            healthCheck: {
                command: ['CMD-SHELL', 'curl -f http://localhost/_nginx_health/ || exit 1'],
                interval: Duration.seconds(30),
                startPeriod: Duration.minutes(5),
                retries: 3,
            },
        })

        const frontendContainer = new ContainerDefinition(this, 'frontend-container', {
            image: ContainerImage.fromDockerImageAsset(
                new DockerImageAsset(this, 'frontend-asset', { directory: '../frontend' })),
            taskDefinition,
            containerName: 'frontend',
            portMappings: [{ containerPort: 3000 }],
            memoryLimitMiB: 2048,
            cpu: 1024,
            logging: LogDriver.awsLogs({ mode: AwsLogDriverMode.BLOCKING, streamPrefix: 'FrontendContainer' }),
            healthCheck: {
                command: ['CMD-SHELL', 'curl -f http://localhost:3000/ || exit 1'],
                interval: Duration.seconds(30),
                startPeriod: Duration.minutes(5),
                retries: 3,
            },
        })

        const backendContainer = new ContainerDefinition(this, 'backend-container', {
            image: ContainerImage.fromDockerImageAsset(
                new DockerImageAsset(this, 'backend-asset', { directory: '../backend' })),
            taskDefinition,
            containerName: 'backend',
            portMappings: [{ containerPort: 8080 }],
            memoryLimitMiB: 2048,
            cpu: 1024,
            logging: LogDriver.awsLogs({ mode: AwsLogDriverMode.BLOCKING, streamPrefix: 'BackendContainer' }),
            healthCheck: {
                command: ['CMD-SHELL', 'curl -f http://localhost:8080/actuator/health/ || exit 1'],
                interval: Duration.seconds(30),
                startPeriod: Duration.minutes(5),
                retries: 3,
            },
        })

        const cluster = new Cluster(this, 'ui-cluster', {
            vpc: this.props.vpc,
            clusterName: 'UrlShortenerUiCluster',
            enableFargateCapacityProviders: true,
        })

        const service = new ApplicationLoadBalancedFargateService(this, 'websocket-chat-service', {
            taskDefinition,
            serviceName: 'WebsocketChat',
            publicLoadBalancer: true,
            protocol: ApplicationProtocol.HTTP,
            cluster,
            desiredCount: 3,
            taskSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        })

        service.targetGroup.configureHealthCheck({
            path: '/',
            protocol: Protocol.HTTP,
            timeout: Duration.seconds(5),
            enabled: true,
            interval: Duration.minutes(1),
            unhealthyThresholdCount: 5,
        })

        return service
    }


}