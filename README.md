# IReport-Covid Technical Documentation

The [IReport-Covid] app leverages blockchain technology to let individuals share COVID-19 related information in a timely, transparent and permanent way.
The app consists of a survey that individuals can fill anonymously, reporting on their symptoms, testing, and medical care.
This data is then posted to the [Algorand blockchain], where it is available for all to see and cannot be modified or removed.
Uses of this data may include informing the public, computing statistics, developing pandemic studies, etc.
(Being stored permanently also means that the same data can even be used for historical studies far in the future.)

The app takes the user-supplied survey answers and sends them to the Algorand blockchain. Specifically, it posts a transaction to the blockchain with the (encoded) information in the `Note` field.
Below we elaborate on the available survey fields, the encoding used to pack them in the transaction, and how to retrieve the information from the blockchain.

## Retrieving the Data

As mentioned above, the survey data is posted on the Algorand blockchain where it is freely available for anyone around the world to use.
Retrieving the survey data requires access to an Algorand node, such the one provided by the [PureStake APIs].
Another option is running your own [Algorand node] (note that you would need an archival node in indexer mode).
Either way, connecting to the node and retrieving the data can be done using one of the [Algorand SDKs]. An example using the [JavaScript SDK] can be found in the file [retrieveData.js](./js/retrieveData.js).
In the coming days we will provide more examples in different programming languages.

## Survey Fields

The available survey fields and their names are summarized in the collapsible section below.
Note that the data sent to the app consists of some subset of these fields, since all the questions in the survey are optional.
Moreover some combinations will never appear since the answers are inconsistent (e.g., reporting that you were not tested for COVID-19 but still providing the date of the test).

<details>
<summary>Click to view all the data fields (in JSON-like format, <code>survey = { ... }</code>):</summary>

```javascript
survey = {
    s : string, // serial number, mandatory
    d : {       // actual survey data, mandatory
      _t: string,   // app identifier, mandatory, must be 'report'
      _v: integer,  // version number, mandatory, must be 1

      // general demographic data
      gc: string,   // country code (see Location Data section below)
      gr: string,   // region code  (see Location Data section below)
      gzp: string,  // 3-digit zip code (US only)
      ga: integer,  // age group, if present must be in 1,11,21,31,41,51,56,61,66,71,76,81,85
      gs: string,   // gender, if present must be 'm','f'

      // symptoms
      sz: integer,  // is symptomatic, no-answer=0/no=-1/yes=1
      s1: boolean,  // fever
      s2: boolean,  // cough
      s3: boolean,  // difficulty breathing
      s4: boolean,  // fatigue
      s5: boolean,  // sore throat
      sds: date     // date symptoms started, yyyy-mm-dd
      sde: date,    // date symptoms ended, yyyy-mm-dd
      sdn: boolean, // still symptomatic

      // tested
      tz: integer,  // tested, no-answer=0/no=-1/yes=1
      tt: integer,  // tried to get tested, no=-1, yes=1, yes but was denied=2
      td: date,     // test date, yyyy-mm-dd
      tr: integer,  // test results, -1=negative,1=positive,2=waiting for result
      tl: integer,  // test location, 1=Dr office/2=Hospital/3=Urgent care/4=Ad-hoc center/5=Other

      // medical care
      mz: integer,  // received care, no-answer=0/no=-1/yes=1
      m1: boolean,  // doctor's office
      m2: boolean,  // walk-in clinic
      m3: boolean,  // virtual care
      m4: boolean,  // hospital/ER
      m5: boolean,  // other
      mh: integer,  // hospitalized, no-answer=0/no=-1/yes=1
      mhs: date,    // date admitted, yyyy-mm-dd
      mhe: date,    // date discharged, yyyy-mm-dd
      mhn: boolean, // still in hospital

      // quarantine
      qz: integer,  // was quarantined, no-answer=0/no=-1/yes=1
      q1: boolean,  // due to symptoms
      q2: boolean,  // voluntarily
      q3: boolean,  // personally required
      q4: boolean,  // general quarantine
      qds: date,    // date quarantine started, yyyy-mm-dd
      qde: date,    // date quarantine ended, yyyy-mm-dd
      qdn: boolean, // still quarantined
      ql: integer,  // left quarantine temporarily no-answer=0/no=-1/yes=1

      consent: boolean // user's consent, mandatory, must be 'true'
    }
}
```

</details>

## Data encoding

Once received by the app, the survey data is validated and encoded using [msgpack], then stored in the `Note` field of an [Algorand transaction structure]. Specifically we use the following code to prepare the transaction structure, see the Algorand [JavaScript SDK] for more information.
```
  [...] // initialize algosdk, get the survey data

  const note = algosdk.encodeObj(data);
  const txn = {
    "amount": 0,
    "note": note,
    "from": senderAddr,
    "to": receiverAddr,
    "fee": params.minFee,
    "firstRound": params.lastRound,
    "lastRound": params.lastRound + 1000,
    "genesisID": params.genesisID,
    "genesisHash": params.genesishashb64
  };
  
  [...] // sign the transaction and post it to the blockchain
```

## Location Data

The demographic data includes some location information, in particular country and region codes. These codes were taken from the [react-country-region-selector] project, with a few modifications. The main change was done for privacy reasons, we omitted all the regions in the European Union with less than 100,000 residents, replacing them with the generic option `Other` (region code `OTH`). For some countries we had to replace the region data by information from the respective Wikipedia pages, specifically for
[Denmark], [Estonia], [Finland], [Hungary], [Latvia], [Malta], and [Slovania]. A JSON file with all the data that we used can be found at [this link](./data/countryRegion.json).

### License

MIT License.


[IReport-COVID]: https://ireport-covid.app/
[Algorand blockchain]: https://developer.algorand.org
[Algorand node]: https://developer.algorand.org/docs/run-a-node/setup/types/#indexer-mode
[Algorand SDKs]: https://developer.algorand.org/docs/reference/sdks/
[JavaScript SDK]: https://github.com/algorand/js-algorand-sdk/
[PureStake APIs]: https://www.purestake.com/technology/algorand-api/
[msgpack]: https://msgpack.org
[Algorand transaction structure]: https://developer.algorand.org/docs/reference/transactions/
[react-country-region-selector]: https://github.com/country-regions/react-country-region-selector
[Denmark]: https://en.wikipedia.org/wiki/Provinces_of_Denmark
[Estonia]: https://en.wikipedia.org/wiki/Counties_of_Estonia
[Finland]: https://en.wikipedia.org/wiki/Regions_of_Finland
[Hungary]: https://en.wikipedia.org/wiki/Counties_of_Hungary
[Latvia]: https://en.wikipedia.org/wiki/Planning_regions_of_Latvia
[Malta]: https://en.wikipedia.org/wiki/Regions_of_Malta
[Slovania]: https://en.wikipedia.org/wiki/Statistical_regions_of_Slovenia
