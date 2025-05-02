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
      const res = await getTenantToken(tenant,token);
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

  // async function doTokenExchange(req,jwt, subdomain) {

  //   console.log('JOB_CREDENTIALS!!!', myServiceBindings.myJobscheduler.uaa);
  //   const getUserToken = async (jwt, myServiceBindings, subdomain) => {
  //     return new Promise((resolve, reject) => {
  //       xssec.requests.requestUserToken(
  //         jwt,
  //         myServiceBindings.myJobscheduler.uaa,
  //         null,
  //         null,
  //         subdomain,
  //         null,
  //         (error, token) => {
  //           if (error) {
  //             return reject(error);
  //           }
  //           resolve(token);
  //         }
  //       );
  //     });
  //   };

  //   try {
  //     return await getUserToken(jwt, myServiceBindings, subdomain);
  //   } catch (error) {
  //     console.log('error!!!!!!', error);
  //   }

  // }

  return super.init()
}}
