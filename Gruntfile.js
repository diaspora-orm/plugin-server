'use strict';

/* global module: false */

module.exports = function gruntInit( grunt ) {
	// Project configuration.

	const baseDocPath = 'doc';
	//	const doccoPath = `${ baseDocPath }/docco`;
	//const jsdocPath = baseDocPath;//`${ baseDocPath }/jsdoc`;
	const jsLib = /*['lib/adapters/baseAdapter.js'] ||*/ [
		'index.js',
		'lib/**/*.js',
		'!node_modules/**/*',
	];
	const jsFilesWTests = jsLib.concat([
		'Gruntfile.js',
		'test/**/*.js',
	]);

	grunt.initConfig({
		pkg:    grunt.file.readJSON( 'package.json' ),
		eslint: {
			options: {
				format: 'stylish', //'node_modules/eslint-tap',
				fix:    true,
			},
			info: {
				options: {
					silent: true,
				},
				src: jsFilesWTests,
			},
			strict: {
				options: {},
				src:     jsFilesWTests,
			},
		},
		//		docco_husky: {
		//			files: {
		//				expand: true,
		//				src:    jsFilesWTests,
		//			},
		//			output_dir:   doccoPath,
		//			project_name: 'Diaspora',
		//			template_dir: 'node_modules/diaspora_doc/docco',
		//			readme:       'README-docco.md',
		//		},
		//		jsdoc: {
		//			src:     /*['lib/adapters/baseAdapter.js'],*/jsLib,
		//			options: {
		//				private:     true,
		//				destination: jsdocPath,
		//				template:    'node_modules/diaspora_doc/jsdoc',
		//				//				readme:      'README-jsdoc.md',
		//			},
		//		},
		clean: {
			doc_jsdoc: {
				src: [ `${ baseDocPath }/jsdoc` ],
			},
			doc_docco: {
				src: [ `${ baseDocPath }/docco` ],
			},
		},
	});

	//grunt.loadNpmTasks( 'grunt-jsdoc' );
	//	grunt.loadNpmTasks( 'grunt-docco-husky' );
	grunt.loadNpmTasks( 'gruntify-eslint' );
	grunt.loadNpmTasks( 'grunt-contrib-clean' );

	require( 'load-grunt-tasks' )( grunt );

	grunt.registerTask( 'documentate', [
		'lint',
		'clean:doc_jsdoc',
		'clean:doc_docco',
		//'jsdoc',
		//		'docco_husky',
	]);
	grunt.registerTask( 'lint', [
		'eslint:info',
	]);
	grunt.registerTask( 'all', [
		'documentate',
	]);
};
