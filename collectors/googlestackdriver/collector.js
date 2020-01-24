/* -----------------------------------------------------------------------------
 * @copyright (C) 2019, Alert Logic, Inc
 * @doc
 *
 * googlestackdriver class.
 *
 * @end
 * -----------------------------------------------------------------------------
 */
'use strict';

const moment = require('moment');
const PawsCollector = require('@alertlogic/paws-collector').PawsCollector;
const parse = require('@alertlogic/al-collector-js').Parse;
const logging = require('@google-cloud/logging');


const typeIdPaths = [
    // TODO: determine if there are any solid paths in JSON and Text payloads. I think these payloads are arbitrary
    {path: ['protoPayload', 'type_url']}
];

class GooglestackdriverCollector extends PawsCollector {

    pawsInitCollectionState(event, callback) {
        // TODO: put in some more efficient catching up logic for historical logs. Stackdriver stores logs for 30 days
        const startTs = process.env.paws_collection_start_ts ? 
                process.env.paws_collection_start_ts :
                    moment().toISOString();
        const endTs = moment(startTs).add(this.pollInterval, 'seconds').toISOString();
        const resourceNames = JSON.parse(process.env.paws_collector_param_string_1);
        const initialStates = resourceNames.map(resource => ({
            resource,
            since: startTs,
            until: endTs,
            poll_interval_sec: 1
        }));
        return callback(null, initialStates, 1);
    }
    
    pawsGetLogs(state, callback) {
        let collector = this;

        // Start API client
        const client = new logging.v2.LoggingServiceV2Client({
            credentials: JSON.parse(collector.secret)
        });


        console.info(`GSTA000001 Collecting data from ${state.since} till ${state.until}`);

        // TODO: figure out a better way to format this. I'm pretty sure that it needs the newlines in it.
        const filter = `timestamp >= "${state.since}"
timestamp < "${state.until}"`;

        const options = {autoPaginate: true};

        // TODO: check out how the "autopagination" functionality works on this.
        client.listLogEntries({filter:filter, [state.resource]}, options)
            .then(responses => {
                const resources = responses[0];
                console.log(resources);

                const newState = collector._getNextCollectionState(state);
                console.info(`GSTA000002 Next collection in ${newState.poll_interval_sec} seconds`);

                return callback(null, resources, newState, newState.poll_interval_sec);
            })
            .catch(err => {
                console.error(err);
            });
    }
    
    _getNextCollectionState(curState) {
        const nowMoment = moment();
        const curUntilMoment = moment(curState.until);
        
        // Check if current 'until' is in the future.
        const nextSinceTs = curUntilMoment.isAfter(nowMoment) ?
                nowMoment.toISOString() :
                curState.until;

        const nextUntilMoment = moment(nextSinceTs).add(this.pollInterval, 'seconds');
        // Check if we're behind collection schedule and need to catch up.
        const nextPollInterval = nowMoment.diff(nextUntilMoment, 'seconds') > this.pollInterval ?
                1 : this.pollInterval;
        
        return  {
             since: nextSinceTs,
             until: nextUntilMoment.toISOString(),
             poll_interval_sec: nextPollInterval
        };
    }
    
    // TODO: probably need to actually decode hte protobuf payload on these logs
    pawsFormatLog(msg) {
        const ts = msg.timestamp ? msg.timestamp : {seconds: Date.now() / 1000};
        
        const typeId = parse.getMsgTypeId(msg, typeIdPaths);
        
        let formattedMsg = {
            // TODO: figure out if this TS is always a string or if they API is goofy...
            messageTs: parseInt(ts.seconds),
            priority: 11,
            progName: 'GooglestackdriverCollector',
            message: JSON.stringify(msg),
            messageType: 'json/googlestackdriver'
        };
        
        if (typeId !== null && typeId !== undefined) {
            formattedMsg.messageTypeId = `${typeId}`;
        }
        if (ts.nanos) {
            formattedMsg.messageTsUs = ts.nanos;
        }
        return formattedMsg;
    }
}

module.exports = {
    GooglestackdriverCollector: GooglestackdriverCollector
}