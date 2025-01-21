import { Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { IpAddresses, IpProtocol, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2'

export interface NetworkStackProps extends StackProps {}

export class NetworkStack extends Stack {

    public readonly vpc: Vpc

    constructor(scope: Construct, id: string, private props: NetworkStackProps) {
        super(scope, id, props)

        this.vpc = this.createVpc()
    }

    private createVpc() {
        return new Vpc(this, 'ui-vpc', {
            vpcName: 'WebSocketChat',
            ipAddresses: IpAddresses.cidr('10.0.0.1/16'),
            ipProtocol: IpProtocol.DUAL_STACK,
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'application',
                    subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                    cidrMask: 24,
                    name: 'egress',
                    subnetType: SubnetType.PUBLIC,
                },
            ],
            natGateways: 1,
        })
    }
}