const cds = require('@sap/cds')

const xssec = require('@sap/xssec')
const xsenv = require('@sap/xsenv')
const axios = require('axios');
const { decodeJwt } = require('@sap/xssec');


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
      const res = await doTokenExchange(req,token);
      console.log('res!!!!', res);
    } catch (error) {
      console.log('errror11!!!', error);
    }
    // try {
    //   const exchangedToken = await doTokenExchange(req,token, tenant)// tenant-specific
    //   console.log('exchangedToken', exchangedToken);
    // } catch (error) {
    //   console.log('error!!:', error);
    // };
          

    // const result = await createJob(exchangedToken)   

    return 'successful'
  })

  const getTenantToken = async (tenant, userJwt) => {
    const uaa = xsenv.getServices({ uaa: { tag: 'xsuaa' } }).uaa;
    // const decoded = decodeJwt(userJwt);  
    const tokenResponse = await axios({
      method: 'post',
      url: `${uaa.url}/oauth/token`,
      headers: {
        Authorization: `Basic ${Buffer.from(`${uaa.clientid}:${uaa.clientsecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&response_type=token&client_id=${uaa.clientid}&assertion=${userJwt}`
    });
  
    return tokenResponse.data.access_token;
  };

  async function doTokenExchange(req,jwt) {

    const jwtDecoded = decode(jwt);
    const consumerSubdomain = jwtDecoded.ext_attr.zdn;  

    console.log('jwt:',jwt);
    console.log('consumerSubdomain',consumerSubdomain);

    try {
      const userToken = await xssec.v3.requests.requestUserToken(jwt,myServiceBindings.myJobscheduler.uaa,null,null,consumerSubdomain,jwtDecoded.ext_attr.zid,(err, exchangedToken) => {
        if (err) {
          console.error('Token exchange failed:', JSON.stringify(err));
        } else {
          console.log('New user token for target service:', exchangedToken);
        }});
    } catch (error) {
      console.log('error:',error);
    }


    // const getUserToken = async (jwt, myServiceBindings) => {

    //   return new Promise((resolve, reject) => {
    //     console.log('JOB_CREDENTIALS!!!',  myServiceBindings.myJobscheduler.uaa);

    //     xssec.v3.requests.requestUserToken(
    //       jwt,
    //       myServiceBindings.myJobscheduler.uaa,
    //       null,
    //       null,
    //       consumerSubdomain,
    //       null,
    //       (error, token) => {
    //         if (error) {
    //           return reject(error);
    //         }
    //         resolve(token);
    //       }
    //     );
    //   });
    // };

    // try {
    //   return await getUserToken(jwt, myServiceBindings);
    // } catch (error) {
    //   console.log('error!!!!!!', JSON.stringify(error));
    // }

  }

  function decode(jwtToken){

    const jwtBase64Encoded = jwtToken.split('.')[1];

    const jwtDecodedAsString = Buffer.from(jwtBase64Encoded, 'base64').toString('ascii');

    return JSON.parse(jwtDecodedAsString);            

}

  return super.init()
}}
