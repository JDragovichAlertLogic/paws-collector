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
    {path: ['jsonPayload', 'fields', 'event_type', 'stringValue']},
    {path: ['protoPayload', 'type_url']},
    {path: ['payload']}
];

class GooglestackdriverCollector extends PawsCollector {

    pawsInitCollectionState(event, callback) {
        const startTs = process.env.paws_collection_start_ts ?
                process.env.paws_collection_start_ts :
                    moment().toISOString();
        let endTs;

        if(moment().diff(startTs, 'days') > 7){
            endTs = moment(startTs).add(7, 'days').toISOString();
        }
        else if(moment().diff(startTs, 'hours') > 24){
            endTs = moment(startTs).add(24, 'hours').toISOString();
        }
        else {
            endTs = moment(startTs).add(this.pollInterval, 'seconds').toISOString();
        }
        const resourceNames = JSON.parse(process.env.paws_collector_param_string_1);
        const initialStates = resourceNames.map(resource => ({
            resource,
            nextPage:null,
            since: startTs,
            until: endTs,
            poll_interval_sec: 1
        }));
        console.log('Inital states: ', initialStates);
        return callback(null, initialStates, 1);
    }
    
    pawsGetLogs(state, callback) {
        let collector = this;

        // Start API client
        const client = new logging.v2.LoggingServiceV2Client({
            credentials: JSON.parse(collector.secret)
        });


        console.info(`GSTA000001 Collecting data from ${state.since} till ${state.until} for ${state.resource}`);

        // TODO: figure out a better way to format this. I'm pretty sure that it needs the newlines in it.
        const filter = `timestamp >= "${state.since}"
timestamp < "${state.until}"`;

        let pagesRetireved = 0;
        const options = {autoPaginate: false};

        const paginationCallback = (result, acc = []) => {
            console.log('getting page: ', pagesRetireved + 1, result[0].length);
            pagesRetireved++;
            const logs = result[0];
            const nextPage = result[1];
            const newAcc = [...acc, ...logs];
            console.log('total Logs', newAcc.length);

            if(nextPage && pagesRetireved < process.env.paws_max_pages_per_invocation){

                return client.listLogEntries(nextPage, options)
                    .then(res => paginationCallback(res, newAcc));
            } else{
                return {logs: newAcc, nextPage};
            }
        };

        let params = state.nextPage ?
            state.nextPage:
            {
                filter,
                pageSize: 1000,
                resourceNames:[state.resource]
            };

        client.listLogEntries(params, options)
            .then(paginationCallback)
            .then(({logs, nextPage}) => {
                const newState = collector._getNextCollectionState(state, nextPage);
                console.info(`GSTA000002 Next collection in ${newState.poll_interval_sec} seconds`);

                return callback(null, logs, newState, newState.poll_interval_sec);
            })
            .catch(err => {
                console.error(`GSTA000003 err in collection ${err}`);
                
                // Stackdriver Logging api has some rate limits that we might run into.
                // If we run inot a rate limit error, instead of returning the error,
                // we return the state back to the queue with an additional second added, up to 10
                // https://cloud.google.com/logging/quotas
                if(err.code === 8){
                    const nextPollInterval = state.poll_interval_sec < 10 ?
                        state.poll_interval_sec + 1:
                        10;
                    const backOffState = Object.assign({}, state, {poll_interval_sec:nextPollInterval});

                    return callback(null, [], backOffState, nextPollInterval);
                }
                return callback(err);
            });
    }
    
    _getNextCollectionState(curState, nextPage) {
        const nowMoment = moment();
        const curUntilMoment = moment(curState.until);
        const {resource} = curState;
        
        // Check if current 'until' is in the future.
        const nextSinceTs = curUntilMoment.isAfter(nowMoment) ?
                nowMoment.toISOString() :
                curState.until;

        let nextUntilMoment;
        if(moment().diff(nextSinceTs, 'days') > 7){
            nextUntilMoment = moment(nextSinceTs).add(7, 'days').toISOString();
        }
        else if(moment().diff(nextSinceTs, 'hours') > 24){
            nextUntilMoment = moment(nextSinceTs).add(24, 'hours').toISOString();
        }
        else {
            nextUntilMoment = moment(nextSinceTs).add(this.pollInterval, 'seconds').toISOString();
        }
        // Check if we're behind collection schedule and need to catch up.
        const nextPollInterval = nowMoment.diff(nextUntilMoment, 'seconds') > this.pollInterval ?
                1 : this.pollInterval;
        
        return  {
            since: nextSinceTs,
            nextPage,
            resource,
            until: nextUntilMoment,
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
