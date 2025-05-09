const cds = require('@sap/cds')

const xssec = require('@sap/xssec')
const xsenv = require('@sap/xsenv')
const axios = require('axios');
const { decodeJwt } = require('@sap/xssec');
const VCAP_APP = JSON.parse(process.env.VCAP_APPLICATION)
const APP_URI = VCAP_APP.application_uris[0]



const myServiceBindings = xsenv.getServices({

  myJobscheduler: { tag: 'jobscheduler' },

  myXsuaa: { tag: 'xsuaa' }

})

const JOB_CREDENTIALS = myServiceBindings.myJobscheduler


module.exports = class AdminService extends cds.ApplicationService { init() {

  const { Books } = this.entities

  /**
   * Generate IDs for new Books drafts
   */
  this.before ('NEW', Books.drafts, async (req) => {
    if (req.data.ID) return
    const { ID:id1 } = await SELECT.one.from(Books).columns('max(ID) as ID')
    const { ID:id2 } = await SELECT.one.from(Books.drafts).columns('max(ID) as ID')
    req.data.ID = Math.max(id1||0, id2||0) + 1
  })

  this.on('createJob', async (req) => {

    let { tenant, user } = cds.context; // e.g., "abc123trial"

    const token = req.headers?.authorization?.split(' ')[1];

    try {
      const exchangedToken = await doTokenExchange(req,token);
      const result = await createJob(exchangedToken)   

      console.log('res!!!!', res);
    } catch (error) {
      console.log('errror11!!!', error);
    }
          
    return 'successful'
  })

  async function  createJob(jwtToken) {
    
    const JobSchedulerClient = require('@sap/jobs-client');
    const scheduler = new JobSchedulerClient.Scheduler({token: jwtToken});
    var options = { 
      job: { // mandatory property, required by jobscheduler client lib
         name: `MuteteJob_${new Date().getMilliseconds()}`,
         action: `https://${APP_URI}/odata/v4/Admin/Books`,          
         active: true,
         httpMethod: 'GET',
         schedules: [{
            time: 'now',
            active: 'true'
         }]   
      } 
   };

    const res = await scheduler.createJob(options); 
 
 }

  

  async function doTokenExchange(req,jwt) {

    const jwtDecoded = decode(jwt);
    const consumerSubdomain = jwtDecoded.ext_attr.zdn;
    

    try {
      const userToken = await xssec.v3.requests.requestUserToken(jwt,myServiceBindings.myJobscheduler.uaa,null,null,consumerSubdomain,jwtDecoded.ext_attr.zid,(err, exchangedToken) => {
        if (err) {
          console.error('Token exchange failed:', JSON.stringify(err));
        } else {
          console.log('New user token for target service:', exchangedToken);
          return exchangedToken;
        }});
      return userToken;
    } catch (error) {
      console.log('error:',error);
    }

  }

  function decode(jwtToken){

    const jwtBase64Encoded = jwtToken.split('.')[1];

    const jwtDecodedAsString = Buffer.from(jwtBase64Encoded, 'base64').toString('ascii');

    return JSON.parse(jwtDecodedAsString);            

}

  return super.init()
}}
