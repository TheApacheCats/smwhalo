<?php
/*
 * Copyright (C) Vulcan Inc.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program.If not, see <http://www.gnu.org/licenses/>.
 *
 */

/**
 * derived from MediaWiki page data importer
 *   Copyright (C) 2003,2005 Brion Vibber <brion@pobox.com>
 *   http://www.mediawiki.org/
 */

/**
 * @file
 * @ingroup DFIO
 *
 * The detector is used to check if an ontology can be imported or if
 * mergings are necessary or if conflicts occur. A merging is required if
 * an ontology element from the same ontology is re-imported. A conflict occurs
 * if two ontology elements from two different ontology are going to have the
 * same name in the wiki.
 *
 * The detector is based on MW's XML import mechanism.
 *
 * @author Kai Kühn
 */
class DeployWikiImporterDetector {
    
	/**
	 * Array of tuples (Title $title, string $command)
	 * 
	 * for details see DeployWikiRevisionDetector
	 */
	var $result;
	
	/**
	 * Bundle ID
	 * 
	 * @var string
	 */
	var $bundleID;
	
	/**
	 * Logger
	 * 
	 * @var Logger (DF_Logger.php)
	 */
	var $logger;


	private $reader = null;
	private $mLogItemCallback, $mUploadCallback, $mRevisionCallback, $mPageCallback;
	private $mSiteInfoCallback, $mTargetNamespace, $mPageOutCallback;
	private $mDebug;

	function __construct($source, $bundleID) {
		$this->reader = new XMLReader();

		stream_wrapper_register( 'uploadsource', 'UploadSourceAdapter' );
		$id = UploadSourceAdapter::registerSource( $source );
		$this->reader->open( "uploadsource://$id" );

		// Default callbacks
		$this->setRevisionCallback( array( $this, "importRevision" ) );
		$this->setUploadCallback( array( $this, 'importUpload' ) );
		$this->setLogItemCallback( array( $this, 'importLogItem' ) );
		$this->setPageOutCallback( array( $this, 'finishImportPage' ) );

		// this class' members initialization
		
		$this->bundleID = $bundleID;
		$this->logger = Logger::getInstance();
		$this->result = array();
	}


	public function getResult() {
		return $this->result;
	}

	private function throwXmlError( $err ) {
		$this->debug( "FAILURE: $err" );
		wfDebug( "WikiImporter XML error: $err\n" );
	}

	private function debug( $data ) {
		if( $this->mDebug ) {
			wfDebug( "IMPORT: $data\n" );
		}
	}

	private function warn( $data ) {
		wfDebug( "IMPORT: $data\n" );
	}

	private function notice( $data ) {
		global $wgCommandLineMode;
		if( $wgCommandLineMode ) {
			print "$data\n";
		} else {
			global $wgOut;
			$wgOut->addHTML( "<li>" . htmlspecialchars( $data ) . "</li>\n" );
		}
	}

	/**
	 * Set debug mode...
	 */
	function setDebug( $debug ) {
		$this->mDebug = $debug;
	}

	/**
	 * Sets the action to perform as each new page in the stream is reached.
	 * @param $callback callback
	 * @return callback
	 */
	public function setPageCallback( $callback ) {
		$previous = $this->mPageCallback;
		$this->mPageCallback = $callback;
		return $previous;
	}

	/**
	 * Sets the action to perform as each page in the stream is completed.
	 * Callback accepts the page title (as a Title object), a second object
	 * with the original title form (in case it's been overridden into a
	 * local namespace), and a count of revisions.
	 *
	 * @param $callback callback
	 * @return callback
	 */
	public function setPageOutCallback( $callback ) {
		$previous = $this->mPageOutCallback;
		$this->mPageOutCallback = $callback;
		return $previous;
	}

	/**
	 * Sets the action to perform as each page revision is reached.
	 * @param $callback callback
	 * @return callback
	 */
	public function setRevisionCallback( $callback ) {
		$previous = $this->mRevisionCallback;
		$this->mRevisionCallback = $callback;
		return $previous;
	}

	/**
	 * Sets the action to perform as each file upload version is reached.
	 * @param $callback callback
	 * @return callback
	 */
	public function setUploadCallback( $callback ) {
		$previous = $this->mUploadCallback;
		$this->mUploadCallback = $callback;
		return $previous;
	}

	/**
	 * Sets the action to perform as each log item reached.
	 * @param $callback callback
	 * @return callback
	 */
	public function setLogItemCallback( $callback ) {
		$previous = $this->mLogItemCallback;
		$this->mLogItemCallback = $callback;
		return $previous;
	}

	/**
	 * Sets the action to perform when site info is encountered
	 * @param $callback callback
	 * @return callback
	 */
	public function setSiteInfoCallback( $callback ) {
		$previous = $this->mSiteInfoCallback;
		$this->mSiteInfoCallback = $callback;
		return $previous;
	}

	/**
	 * Set a target namespace to override the defaults
	 */
	public function setTargetNamespace( $namespace ) {
		if( is_null( $namespace ) ) {
			// Don't override namespaces
			$this->mTargetNamespace = null;
		} elseif( $namespace >= 0 ) {
			// FIXME: Check for validity
			$this->mTargetNamespace = intval( $namespace );
		} else {
			return false;
		}
	}

	/**
	 * Default per-revision callback, performs the import.
	 * @param $revision WikiRevision
	 */
	public function importRevision( $revision ) {
		$dbw = wfGetDB( DB_MASTER );
		return $dbw->deadlockLoop( array( $revision, 'importOldRevision' ) );
	}

	/**
	 * Default per-revision callback, performs the import.
	 * @param $rev WikiRevision
	 */
	public function importLogItem( $rev ) {
		$dbw = wfGetDB( DB_MASTER );
		return $dbw->deadlockLoop( array( $rev, 'importLogItem' ) );
	}

	/**
	 * Dummy for now...
	 */
	public function importUpload( $revision ) {
		//$dbw = wfGetDB( DB_MASTER );
		//return $dbw->deadlockLoop( array( $revision, 'importUpload' ) );
		return false;
	}

	/**
	 * Mostly for hook use
	 */
	public function finishImportPage( $title, $origTitle, $revCount, $sRevCount, $pageInfo ) {
		$args = func_get_args();
		return wfRunHooks( 'AfterImportPage', $args );
	}

	/**
	 * Alternate per-revision callback, for debugging.
	 * @param $revision WikiRevision
	 */
	public function debugRevisionHandler( &$revision ) {
		$this->debug( "Got revision:" );
		if( is_object( $revision->title ) ) {
			$this->debug( "-- Title: " . $revision->title->getPrefixedText() );
		} else {
			$this->debug( "-- Title: <invalid>" );
		}
		$this->debug( "-- User: " . $revision->user_text );
		$this->debug( "-- Timestamp: " . $revision->timestamp );
		$this->debug( "-- Comment: " . $revision->comment );
		$this->debug( "-- Text: " . $revision->text );
	}

	/**
	 * Notify the callback function when a new <page> is reached.
	 * @param $title Title
	 */
	function pageCallback( $title ) {
		if( isset( $this->mPageCallback ) ) {
			call_user_func( $this->mPageCallback, $title );
		}
	}

	/**
	 * Notify the callback function when a </page> is closed.
	 * @param $title Title
	 * @param $origTitle Title
	 * @param $revCount Integer
	 * @param $sucCount Int: number of revisions for which callback returned true
	 * @param $pageInfo Array: associative array of page information
	 */
	private function pageOutCallback( $title, $origTitle, $revCount, $sucCount, $pageInfo ) {
		if( isset( $this->mPageOutCallback ) ) {
			$args = func_get_args();
			call_user_func_array( $this->mPageOutCallback, $args );
		}
	}

	/**
	 * Notify the callback function of a revision
	 * @param $revision A WikiRevision object
	 */
	private function revisionCallback( $revision ) {
		if ( isset( $this->mRevisionCallback ) ) {
			return call_user_func_array( $this->mRevisionCallback,
			array( $revision, $this ) );
		} else {
			return false;
		}
	}

	/**
	 * Notify the callback function of a new log item
	 * @param $revision A WikiRevision object
	 */
	private function logItemCallback( $revision ) {
		if ( isset( $this->mLogItemCallback ) ) {
			return call_user_func_array( $this->mLogItemCallback,
			array( $revision, $this ) );
		} else {
			return false;
		}
	}

	/**
	 * Shouldn't something like this be built-in to XMLReader?
	 * Fetches text contents of the current element, assuming
	 * no sub-elements or such scary things.
	 * @return string
	 * @access private
	 */
	private function nodeContents() {
		if( $this->reader->isEmptyElement ) {
			return "";
		}
		$buffer = "";
		while( $this->reader->read() ) {
			switch( $this->reader->nodeType ) {
				case XmlReader::TEXT:
				case XmlReader::SIGNIFICANT_WHITESPACE:
					$buffer .= $this->reader->value;
					break;
				case XmlReader::END_ELEMENT:
					return $buffer;
			}
		}

		$this->reader->close();
		return '';
	}

	# --------------

	/** Left in for debugging */
	private function dumpElement() {
		static $lookup = null;
		if (!$lookup) {
			$xmlReaderConstants = array(
                "NONE",
                "ELEMENT",
                "ATTRIBUTE",
                "TEXT",
                "CDATA",
                "ENTITY_REF",
                "ENTITY",
                "PI",
                "COMMENT",
                "DOC",
                "DOC_TYPE",
                "DOC_FRAGMENT",
                "NOTATION",
                "WHITESPACE",
                "SIGNIFICANT_WHITESPACE",
                "END_ELEMENT",
                "END_ENTITY",
                "XML_DECLARATION",
			);
			$lookup = array();

			foreach( $xmlReaderConstants as $name ) {
				$lookup[constant("XmlReader::$name")] = $name;
			}
		}

		print( var_dump(
		$lookup[$this->reader->nodeType],
		$this->reader->name,
		$this->reader->value
		)."\n\n" );
	}

	/**
	 * Primary entry point
	 */
	public function doImport() {
		$this->reader->read();

		if ( $this->reader->name != 'mediawiki' ) {
			throw new MWException( "Expected <mediawiki> tag, got ".
			$this->reader->name );
		}
		$this->debug( "<mediawiki> tag is correct." );

		$this->debug( "Starting primary dump processing loop." );

		$keepReading = $this->reader->read();
		$skip = false;
		while ( $keepReading ) {
			$tag = $this->reader->name;
			$type = $this->reader->nodeType;

			if ( !wfRunHooks( 'ImportHandleToplevelXMLTag', $this ) ) {
				// Do nothing
			} elseif ( $tag == 'mediawiki' && $type == XmlReader::END_ELEMENT ) {
				break;
			} elseif ( $tag == 'siteinfo' ) {
				$this->handleSiteInfo();
			} elseif ( $tag == 'page' ) {
				$this->handlePage();
			} elseif ( $tag == 'logitem' ) {
				$this->handleLogItem();
			} elseif ( $tag != '#text' ) {
				$this->warn( "Unhandled top-level XML tag $tag" );

				$skip = true;
			}

			if ($skip) {
				$keepReading = $this->reader->next();
				$skip = false;
				$this->debug( "Skip" );
			} else {
				$keepReading = $this->reader->read();
			}
		}

		return true;
	}

	private function handleSiteInfo() {
		// Site info is useful, but not actually used for dump imports.
		// Includes a quick short-circuit to save performance.
		if ( ! $this->mSiteInfoCallback ) {
			$this->reader->next();
			return true;
		}
		throw new MWException( "SiteInfo tag is not yet handled, do not set mSiteInfoCallback" );
	}

	private function handleLogItem() {
		$this->debug( "Enter log item handler." );
		$logInfo = array();

		// Fields that can just be stuffed in the pageInfo object
		$normalFields = array( 'id', 'comment', 'type', 'action', 'timestamp',
                    'logtitle', 'params' );

		while ( $this->reader->read() ) {
			if ( $this->reader->nodeType == XmlReader::END_ELEMENT &&
			$this->reader->name == 'logitem') {
				break;
			}

			$tag = $this->reader->name;

			if ( !wfRunHooks( 'ImportHandleLogItemXMLTag',
			$this, $logInfo ) ) {
				// Do nothing
			} elseif ( in_array( $tag, $normalFields ) ) {
				$logInfo[$tag] = $this->nodeContents();
			} elseif ( $tag == 'contributor' ) {
				$logInfo['contributor'] = $this->handleContributor();
			} elseif ( $tag != '#text' ) {
				$this->warn( "Unhandled log-item XML tag $tag" );
			}
		}

		$this->processLogItem( $logInfo );
	}

	private function processLogItem( $logInfo ) {
		$revision = new DeployWikiRevisionDetector($this->bundleID);

		$revision->setID( $logInfo['id'] );
		$revision->setType( $logInfo['type'] );
		$revision->setAction( $logInfo['action'] );
		$revision->setTimestamp( $logInfo['timestamp'] );
		$revision->setParams( $logInfo['params'] );
		$revision->setTitle( Title::newFromText( $logInfo['logtitle'] ) );

		if ( isset( $logInfo['comment'] ) ) {
			$revision->setComment( $logInfo['comment'] );
		}

		if ( isset( $logInfo['contributor']['ip'] ) ) {
			$revision->setUserIP( $logInfo['contributor']['ip'] );
		}
		if ( isset( $logInfo['contributor']['username'] ) ) {
			$revision->setUserName( $logInfo['contributor']['username'] );
		}

		return $this->logItemCallback( $revision );
	}

	private function handlePage() {
		// Handle page data.
		$this->debug( "Enter page handler." );
		$pageInfo = array( 'revisionCount' => 0, 'successfulRevisionCount' => 0 );

		// Fields that can just be stuffed in the pageInfo object
		$normalFields = array( 'title', 'id', 'redirect', 'restrictions' );

		$skip = false;
		$badTitle = false;

		while ( $skip ? $this->reader->next() : $this->reader->read() ) {
			if ( $this->reader->nodeType == XmlReader::END_ELEMENT &&
			$this->reader->name == 'page') {
				break;
			}

			$tag = $this->reader->name;

			if ( $badTitle ) {
				// The title is invalid, bail out of this page
				$skip = true;
			} elseif ( !wfRunHooks( 'ImportHandlePageXMLTag', array( $this,
			&$pageInfo ) ) ) {
				// Do nothing
			} elseif ( in_array( $tag, $normalFields ) ) {
				$pageInfo[$tag] = $this->nodeContents();
				if ( $tag == 'title' ) {
					$title = $this->processTitle( $pageInfo['title'] );

					if ( !$title ) {
						$badTitle = true;
						$skip = true;
					}

					$this->pageCallback( $title );
					list( $pageInfo['_title'], $origTitle ) = $title;
				}
			} elseif ( $tag == 'revision' ) {
				$this->handleRevision( $pageInfo );
			} elseif ( $tag == 'upload' ) {
				$this->handleUpload( $pageInfo );
			} elseif ( $tag != '#text' ) {
				$this->warn( "Unhandled page XML tag $tag" );
				$skip = true;
			}
		}

		$this->pageOutCallback( $pageInfo['_title'], $origTitle,
		$pageInfo['revisionCount'],
		$pageInfo['successfulRevisionCount'],
		$pageInfo );
	}

	private function handleRevision( &$pageInfo ) {
		$this->debug( "Enter revision handler" );
		$revisionInfo = array();

		$normalFields = array( 'id', 'timestamp', 'comment', 'minor', 'text' );

		$skip = false;

		while ( $skip ? $this->reader->next() : $this->reader->read() ) {
			if ( $this->reader->nodeType == XmlReader::END_ELEMENT &&
			$this->reader->name == 'revision') {
				break;
			}

			$tag = $this->reader->name;

			if ( !wfRunHooks( 'ImportHandleRevisionXMLTag', $this,
			$pageInfo, $revisionInfo ) ) {
				// Do nothing
			} elseif ( in_array( $tag, $normalFields ) ) {
				$revisionInfo[$tag] = $this->nodeContents();
			} elseif ( $tag == 'contributor' ) {
				$revisionInfo['contributor'] = $this->handleContributor();
			} elseif ( $tag != '#text' ) {
				$this->warn( "Unhandled revision XML tag $tag" );
				$skip = true;
			}
		}

		$pageInfo['revisionCount']++;
		if ( $this->processRevision( $pageInfo, $revisionInfo ) ) {
			$pageInfo['successfulRevisionCount']++;
		}
	}

	private function processRevision( $pageInfo, $revisionInfo ) {
		$revision = new DeployWikiRevisionDetector($this->bundleID);

		$revision->setID( array_key_exists('id', $revisionInfo) ? $revisionInfo['id'] : -1 );
		$revision->setText( $revisionInfo['text'] );
		$revision->setTitle( $pageInfo['_title'] );
		$revision->setTimestamp( $revisionInfo['timestamp'] );

		if ( isset( $revisionInfo['comment'] ) ) {
			$revision->setComment( $revisionInfo['comment'] );
		}

		if ( isset( $revisionInfo['minor'] ) )
		$revision->setMinor( true );

		if ( isset( $revisionInfo['contributor']['ip'] ) ) {
			$revision->setUserIP( $revisionInfo['contributor']['ip'] );
		}
		if ( isset( $revisionInfo['contributor']['username'] ) ) {
			$revision->setUserName( $revisionInfo['contributor']['username'] );
		}

		$result =  $this->revisionCallback( $revision );
	    if (!is_null($revision) && !is_null($revision->getResult())) {
             $this->result[] = $revision->getResult();
        }
		return $result;
	}

	private function handleUpload( &$pageInfo ) {
		$this->debug( "Enter upload handler" );
		$uploadInfo = array();

		$normalFields = array( 'timestamp', 'comment', 'filename', 'text',
                    'src', 'size' );

		$skip = false;

		while ( $skip ? $this->reader->next() : $this->reader->read() ) {
			if ( $this->reader->nodeType == XmlReader::END_ELEMENT &&
			$this->reader->name == 'upload') {
				break;
			}

			$tag = $this->reader->name;

			if ( !wfRunHooks( 'ImportHandleUploadXMLTag', $this,
			$pageInfo ) ) {
				// Do nothing
			} elseif ( in_array( $tag, $normalFields ) ) {
				$uploadInfo[$tag] = $this->nodeContents();
			} elseif ( $tag == 'contributor' ) {
				$uploadInfo['contributor'] = $this->handleContributor();
			} elseif ( $tag != '#text' ) {
				$this->warn( "Unhandled upload XML tag $tag" );
				$skip = true;
			}
		}

		return $this->processUpload( $pageInfo, $uploadInfo );
	}

	private function processUpload( $pageInfo, $uploadInfo ) {
		$revision = new DeployWikiRevisionDetector($this->bundleID);

		$revision->setTitle( $pageInfo['_title'] );
		$revision->setID( $uploadInfo['id'] );
		$revision->setTimestamp( $uploadInfo['timestamp'] );
		$revision->setText( $uploadInfo['text'] );
		$revision->setFilename( $uploadInfo['filename'] );
		$revision->setSrc( $uploadInfo['src'] );
		$revision->setSize( intval( $uploadInfo['size'] ) );
		$revision->setComment( $uploadInfo['comment'] );

		if ( isset( $uploadInfo['contributor']['ip'] ) ) {
			$revision->setUserIP( $uploadInfo['contributor']['ip'] );
		}
		if ( isset( $uploadInfo['contributor']['username'] ) ) {
			$revision->setUserName( $uploadInfo['contributor']['username'] );
		}

		return $this->uploadCallback( $revision );
	}

	private function handleContributor() {
		$fields = array( 'id', 'ip', 'username' );
		$info = array();

		while ( $this->reader->read() ) {
			if ( $this->reader->nodeType == XmlReader::END_ELEMENT &&
			$this->reader->name == 'contributor') {
				break;
			}

			$tag = $this->reader->name;

			if ( in_array( $tag, $fields ) ) {
				$info[$tag] = $this->nodeContents();
			}
		}

		return $info;
	}

	private function processTitle( $text ) {
		$workTitle = $text;
		$origTitle = Title::newFromText( $workTitle );

		if( !is_null( $this->mTargetNamespace ) && !is_null( $origTitle ) ) {
			$title = Title::makeTitle( $this->mTargetNamespace,
			$origTitle->getDBkey() );
		} else {
			$title = Title::newFromText( $workTitle );
		}

		if( is_null( $title ) ) {
			// Invalid page title? Ignore the page
			$this->notice( "Skipping invalid page title '$workTitle'" );
			return false;
		} elseif( $title->getInterwiki() != '' ) {
			$this->notice( "Skipping interwiki page title '$workTitle'" );
			return false;
		}

		return array( $title, $origTitle );
	}




}
class DeployWikiRevisionDetector extends WikiRevision {

	/**
	 * Tuple describes the result of detection
	 * 
	 * (Title $title, string $command)
	 * 
	 *  command is one of: 
	 *     "notexist"  => Page does not exist 
	 *     "merge"     => Page exists and belongs to same bundle
	 *     "conflict"  => Page exists and belongs to different bundle
	 * 
	 */
	var $result;

	/**
     * Bundle ID
     * 
     * @var string
     */
	var $bundleID;
	
	/**
	 * Logger
	 * 
	 * @var Logger
	 */
	var $logger;

	public function __construct($bundleID) {
		
		$this->bundleID = $bundleID;
		$this->result = NULL;
		$this->logger = Logger::getInstance();
	}


	public function getResult() {
		return $this->result;
	}

	/**
	 *
	 *
	 * @return unknown
	 */
	function importOldRevision() {


		$dbw = wfGetDB( DB_MASTER );
		// check revision here
		$linkCache = LinkCache::singleton();
		$linkCache->clear();

		global $dfgLang;
		if ($this->title->getNamespace() == NS_TEMPLATE && $this->title->getText() === $dfgLang->getLanguageString('df_partofbundle')) return false;

		$article = new Article( $this->title );
		$pageId = $article->getId();

		if( $pageId == 0 ) {
			# page does not exist

			$this->result = array($this->title, "notexist");
			return false;
		} else {

			$prior = Revision::loadFromTitle( $dbw, $this->title );
			if( !is_null( $prior ) ) {

				// revision already exists.

				$partOfOntology = SMWDIProperty::newFromUserLabel($dfgLang->getLanguageString('df_partofbundle'));
				$values = smwfGetStore()->getPropertyValues(SMWDIWikiPage::newFromTitle($this->title), $partOfOntology);

				// FIXME: deal also with pages in MediaWiki namespace as possible conflict
				if ($this->title->getNamespace() == NS_MEDIAWIKI) {
					$this->result = array($this->title, "merge");
					return false;
				}
				if (count($values) > 0) {
					$v = reset($values);
					$bundleID = $v->getTitle()->getDBkey();
					if ($bundleID == ucfirst($this->bundleID)) {
						// same ontology, no conflict but merging necessary

						$this->result = array($this->title, "merge");
					} else {
						// conflict
						 
						$this->result = array($this->title, "conflict");
					}
				} else {

					$this->result = array($this->title, "conflict");
				}

			}
		}
		return false;

	}

}
