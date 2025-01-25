import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
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
    ExecuteCommandLogging,
    LogDriver,
    NetworkMode,
    TaskDefinition,
} from 'aws-cdk-lib/aws-ecs'
import {
    AnyPrincipal,
    Effect,
    ManagedPolicy,
    Policy,
    PolicyStatement,
    Role,
    ServicePrincipal,
} from 'aws-cdk-lib/aws-iam'
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets'
import { Key } from 'aws-cdk-lib/aws-kms'
import { LogGroup } from 'aws-cdk-lib/aws-logs'
import { Bucket } from 'aws-cdk-lib/aws-s3'


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
        const sshKmsKey = new Key(this, "service-kms");

        const logGroup = new LogGroup(this, "SSHClusterGroup", {
            encryptionKey: sshKmsKey,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const execBucket = new Bucket(this, "SSHClusterBucket", {
            encryptionKey: sshKmsKey,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const cluster = new Cluster(this, 'websocketchat-cluster', {
            vpc: this.props.vpc,
            clusterName: 'WebsocketChatCluster',
            enableFargateCapacityProviders: true,
            executeCommandConfiguration: {
                kmsKey: sshKmsKey,
                logging: ExecuteCommandLogging.OVERRIDE,
                logConfiguration: {
                    cloudWatchLogGroup: logGroup,
                    cloudWatchEncryptionEnabled: true,
                    s3Bucket: execBucket,
                    s3KeyPrefix: "exec-command-output",
                    s3EncryptionEnabled: true,
                }
            }
        })

        const taskRole = new Role(this, 'service-role', {
            assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
            managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy")],
        })

        const kmsDecPolicy = new Policy(this, "Policy", {
            statements: [
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        "ssmmessages:CreateControlChannel",
                        "ssmmessages:CreateDataChannel",
                        "ssmmessages:OpenControlChannel",
                        "ssmmessages:OpenDataChannel",
                    ],
                    resources: ["*"],
                }),
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["logs:DescribeLogGroups"],
                    resources: ["*"],
                }),
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: [
                        "logs:CreateLogStream",
                        "logs:DescribeLogStreams",
                        "logs:PutLogEvents",
                    ],
                    resources: [
                        `arn:aws:logs:us-east-1:1234567890:log-group:/aws/ecs/ecs-exec-demo:*`,
                    ],
                }),
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["s3:PutObject"],
                    resources: [`${execBucket.bucketArn}/*`],
                }),
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["s3:GetEncryptionConfiguration"],
                    resources: [execBucket.bucketArn],
                }),
                new PolicyStatement({
                    effect: Effect.ALLOW,
                    actions: ["kms:Decrypt"],
                    resources: [sshKmsKey.keyArn],
                }),
            ],
        })

        taskRole.attachInlinePolicy(kmsDecPolicy)

        const taskDefinition = new TaskDefinition(this, 'service-task', {
            networkMode: NetworkMode.AWS_VPC,
            taskRole,
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
            environment: {
                FRONTEND_SERVER_NAME: 'frontend',
                FRONTEND_SERVER_PORT: '3000',
                BACKEND_SERVER_NAME: 'backend',
                BACKEND_SERVER_PORT: '8080',
            }
        })

        const frontendContainer = new ContainerDefinition(this, 'frontend-container', {
            image: ContainerImage.fromDockerImageAsset(
                new DockerImageAsset(this, 'frontend-asset', { directory: '../frontend' })),
            taskDefinition,
            containerName: 'frontend',
            portMappings: [{ containerPort: 3000 }],
            memoryLimitMiB: 2048,
            cpu: 1024,
            environment: {
                HOSTNAME: 'localhost',
            },
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

        const service = new ApplicationLoadBalancedFargateService(this, 'websocket-chat-service', {
            taskDefinition,
            serviceName: 'WebsocketChat',
            publicLoadBalancer: true,
            protocol: ApplicationProtocol.HTTP,
            enableExecuteCommand: true,
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