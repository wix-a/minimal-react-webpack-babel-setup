import { Router } from 'express';
import * as wixExpressCsrf from '@wix/wix-express-csrf';
import * as wixExpressRequireHttps from '@wix/wix-express-require-https';
import { AppContext } from './config';
import getOffering from './offerings-catalog';

module.exports = (app: Router, context: AppContext) => {
  app.use(wixExpressCsrf());
  app.use(wixExpressRequireHttps);

  app.get('/offerings/:offeringId', async (req, res) => {
    console.log(`app.get('/offerings/:offeringId', req, res)`);
    try {
      // @ts-ignore
      const offering = await getOffering(req.aspects, req.params.offeringId);
      res.send(offering);
    } catch(ex) {

    }
  });

  app.get('/', (req, res) => {
    res.status(200);
    res.send('Malachi is da king!');
  });

  return app;
};
