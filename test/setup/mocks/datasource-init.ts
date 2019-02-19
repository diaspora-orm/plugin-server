import _ from 'lodash';
import { Diaspora } from '@diaspora/diaspora';

export const SOURCE_NAME = 'myDataSource';
export const inMemorySource = Diaspora.createNamedDataSource( SOURCE_NAME, 'inMemory', {} );
