const algosdk = require('algosdk');
const fs = require('fs');

// This example uses the PureStake API
const server = "https://testnet-algorand.api.purestake.io/ps1";
const port = "";
const token = {
    'X-API-key' : 'B3SU4KcVKi94Jap2VXkK83xx38bsv95K5UZm2lab',
};
// Replace the above by https://mainnet-algorand.api.purestake.io/ps1
// and your API-Token from PureStake

// To use your own node, find the token, server, and port values for
// your installation in the algod.net and algod.token files within
// the Algorand data directory, and put them below:

// const token = "token from the file algod.token";
// const server = "http://127.0.0.1"; // usually running as localhost
// const port = 8081;                 // the default port for local algod


// An array of all possible attributes
const headers = [
    '_t',  // string, app identifier, mandatory, must be 'report'
    '_v',  // integer, version number, mandatory, must be 1

    // general demographic data
    'gc',  // string, country code (see Location Data section below)
    'gr',  // string, region code  (see Location Data section below)
    'gzp', // string, 3-digit zip code (US only)
    'ga',  // integer, age group, if present must be in 1,11,21,31,41,51,56,61,66,71,76,81,85
    'gs',  // string , gender, if present must be 'm','f'

    // symptoms
    'sz',  // integer, is symptomatic, no-answer=0/no=-1/yes=1
    's1',  // boolean, fever
    's2',  // boolean, cough
    's3',  // boolean, difficulty breathing
    's4',  // boolean, fatigue
    's5',  // boolean, sore throat
    'sds', // date, when symptoms started, yyyy-mm-dd
    'sde', // date, when symptoms ended, yyyy-mm-dd
    'sdn', // boolean, still symptomatic

    // tested
    'tz',  // integer, tested, no-answer=0/no=-1/yes=1
    'tt',  // integer, tried to get tested, no=-1, yes=1, yes but was denied=2
    'td',  // date, test date, yyyy-mm-dd
    'tr',  // integer, test results, -1=negative,1=positive,2=waiting for result
    'tl',  // integer, test location, 1=Dr office/2=Hospital/3=Urgent care/4=Ad-hoc center/5=Other

    // medical care
    'mz',  // integer, received care, no-answer=0/no=-1/yes=1
    'm1',  // boolean, doctor's office
    'm2',  // boolean, walk-in clinic
    'm3',  // boolean, virtual care
    'm4',  // boolean, hospital/ER
    'm5',  // boolean, other
    'mh',  // integer, hospitalized, no-answer=0/no=-1/yes=1
    'mhs', // date, when admitted, yyyy-mm-dd
    'mhe', // date, when discharged, yyyy-mm-dd
    'mhn', // boolean, still in hospital

    // quarantine
    'qz',  // integer, was quarantined, no-answer=0/no=-1/yes=1
    'q1',  // boolean, due to symptoms
    'q2',  // boolean, voluntarily
    'q3',  // boolean, personally required
    'q4',  // boolean, general quarantine
    'qds', // date, when quarantine started, yyyy-mm-dd
    'qde', // date, when quarantine ended, yyyy-mm-dd
    'qdn', // boolean, still quarantined
    'ql',  // integer, left quarantine temporarily no-answer=0/no=-1/yes=1

    'consent' // boolean' , user's consent, mandatory, must be 'true'
];

// When retrieving the real data from mainnet, replace the address below by
// const address = "COVIDR5MYE757XMDCFOCS5BXFF4SKD5RTOF4RTA67F47YTJSBR5U7TKBNU"
// const fromRound = 5646000

const address = "7IOLVZCTP3N5ZZMMDLPZI5EQP7PGXO2A7CYHBZR6IGXKE56H7ISUS66ZKI";
const fromRound = 5690110;

// The PureStake API put a limit of how many transactions you can get
// for each call to algod.transactionByAddress(...). Experimentally
// it seems like 500 is the bound used there
const maxTxnPerCall = 500;

// Initialize the algod client and get the basic parameters
const algod = new algosdk.Algod(token, server, port);

// A recursive function for getting a batch of transactions, to overcome
// the limitation of maxTxnPerCall transaction per call to the API
async function getTransactionBatch(fromRnd, toRnd) {
    if (fromRnd > toRnd) { // sanity check
        return [];
    }

    // make an API call to get the transactions
    let txs = await algod.transactionByAddress(address,fromRnd,toRnd,maxTxnPerCall);

    // there might not have any tx in range in which case sdk returns empty object ...
    if (typeof txs.transactions === 'undefined') {
        return [ ];
    }

    // If we got all the transactions, just return them
    if (fromRnd == toRnd || txs.transactions.length < maxTxnPerCall) {
        return txs.transactions;
        // FIXME: If a single block contains more than maxTxnPerCall
        // transactions for the target address, the code above will return
        // only maxTxnPerCall of them.
        // This is an unlikely case, and not easy to handle. The only way to
        // handle it is to call algod.block(round#), then go over all the
        // transactions in this block and take only the ones corresponding
        // to the target address.
    }
    else { // recursive call to get them in two smaller chunks
        let midRnd = Math.floor((fromRnd+toRnd) / 2);
        let txns1 = await getTransactionBatch(fromRnd, midRnd);
        let txns2 = await getTransactionBatch(midRnd+1, toRnd);

        // return the concatenation of the two chunks
        return txns1.concat(txns2);
    }
}


// Read the transactions from the blockchain. Your Algorand node must
// be an archival node in indexer mode for the code below to work
(async() => {
 
    let rowcnt = 0;
    let fstr = fs.createWriteStream('covidData.csv')
    fstr.write('sr,rnd,'+headers.toString()+'\n'); // write the header
    // 'sr' is serial number, 'rnd' is round number

    const params = await algod.getTransactionParams();
    
    // Read the transactions from the blockchain in 512-block installations
    const batchSize = 512;
    for (let rnd = fromRound; rnd < params.lastRound; rnd+=batchSize) {
        let toRnd = rnd + batchSize;
        if (toRnd > params.lastRound) {
            toRnd = params.lastRound;
        }

        // Fetch transactions for these rounds
        let txns = await getTransactionBatch(rnd, toRnd);

        // Write transaction
        for (let i = 0; i < txns.length; i++) {
            // Decode data in Note field
            let tx = txns[i];
            let noteData = algosdk.decodeObj(tx.note);

            // must have a serial number and data, else continue to next one
            if (!noteData.s || !noteData.d) {
                continue;
            }
            let line = noteData.s+','+tx.round;
            for (let j = 0; j < headers.length; j++) {
                line += ",";                 // followed by a comma
                let key = headers[j];
                if (noteData.d[key]) {       // if a value exists
                    line += noteData.d[key]; // write it
                }
            }
            fstr.write(line+'\n');
            rowcnt++;
        }
    }
    console.log("Number of Rows: " + rowcnt);
    fstr.end(); // close the file

})().catch(e => {
    console.log(e);
});
