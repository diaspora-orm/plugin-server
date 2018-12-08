/**
 * Lists all HTTP status codes used by this webserver
 *
 * @author Gerkin
 */
export enum EHttpStatusCode {
	Ok = 200,
	Created = 201,
	NoContent = 204,

	MalformedQuery = 400,
	Forbidden = 403,
	NotFound = 404,
  MethodNotAllowed = 405,
  UnsupportedMediaType = 415,

	ServerError = 500,
}
