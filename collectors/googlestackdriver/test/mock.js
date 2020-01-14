process.env.AWS_REGION = 'us-east-1';
process.env.al_api = 'api.global-services.global.alertlogic.com';
process.env.ingest_api = 'ingest.global-services.global.alertlogic.com';
process.env.azollect_api = 'azcollect.global-services.global.alertlogic.com';
process.env.aims_access_key_id = 'aims-key-id';
process.env.aims_secret_key = 'aims-secret-key-encrypted';
process.env.log_group = 'logGroupName';
process.env.paws_state_queue_arn = "arn:aws:sqs:us-east-1:352283894008:paws-state-queue";
process.env.paws_extension = 'googlestackdriver';
process.env.googlestackdriver_endpoint = 'https://test.alertlogic.com/';
process.env.googlestackdriver_token = 'googlestackdriver-token';
process.env.collector_id = 'collector-id';

const AIMS_TEST_CREDS = {
    access_key_id: 'test-access-key-id',
    secret_key: 'test-secret-key'
};

const LOG_EVENT = { labels: {},
    insertId: '-qwnqhydhp96',
    httpRequest: null,
    resource: { labels: [Object], type: 'project' },
    timestamp: { seconds: '1577807973', nanos: 776000000 },
    severity: 'NOTICE',
    logName:
     'projects/joe-test-8675309/logs/cloudaudit.googleapis.com%2Factivity',
    operation: null,
    trace: '',
    sourceLocation: null,
    receiveTimestamp: { seconds: '1577807974', nanos: 105817306 },
    metadata: null,
    spanId: '',
    traceSampled: false,
    protoPayload:
     { type_url: 'type.googleapis.com/google.cloud.audit.AuditLog',
       value:
        <Buffer 12 00 1a 1c 0a 1a 6a 6f 73 65 70 68 2e 64 72 61 67 6f 76 69 63 68 40 67 6d 61 69 6c 2e 63 6f 6d 22 94 01 0a 0d 31 36 35 2e 32 32 35 2e 38 31 2e 39 36 ... > },
    payload: 'protoPayload' };

const FUNCTION_ARN = 'arn:aws:lambda:us-east-1:352283894008:function:test-01-CollectLambdaFunction-2CWNLPPW5XO8';
const FUNCTION_NAME = 'test-TestCollectLambdaFunction-1JNNKQIPOTEST';

module.exports = {
    AIMS_TEST_CREDS: AIMS_TEST_CREDS,
    FUNCTION_ARN: FUNCTION_ARN,
    FUNCTION_NAME: FUNCTION_NAME,
    LOG_EVENT: LOG_EVENT
};
