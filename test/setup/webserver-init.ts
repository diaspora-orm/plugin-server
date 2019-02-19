import * as express from 'express';
import { config } from './config';

export const app = express();
export const httpServer = app.listen( config.port, () => {
	console.log( `Example app listening on port ${config.port}!` );
} );
export const httpServerReady = new Promise( ( resolve, reject ) => httpServer
	.addListener( 'listening', resolve )
	.addListener( 'error', reject ) );

// Bind the dynamic middleware
app.use( '/api', ( req, res, next ) => {
	if ( !apiMiddleware ){
		throw new Error( 'Missing middleware' );
	} else {
		apiMiddleware( req, res, next );
	}
} );


let apiMiddleware: express.RequestHandler | undefined = undefined;
export const setApiMiddleware = ( newMiddleware?: express.RequestHandler ) => {
	apiMiddleware = newMiddleware;
};
