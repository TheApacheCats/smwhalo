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
 * @file
 * @ingroup WebAdmin
 *
 * webadmin scripts for the WAT operations
 * 	
 * 	- finalizeStarted
 *  - installStarted
 *	- deinstallStarted
 *  - updateStarted
 *  - globalUpdateStarted
 *  - extensionsDetailsStarted
 *
 * @author: Kai Kühn
 *
 */

/**
 * Called when finalization process has been started.
 * 
 * @param xhr
 *            HTTP responseObject
 * @param int
 *            status HTTP response code
 */
$.webAdmin = { operations : {} };

$.webAdmin.operations.finalizeStarted = function(xhr, status) {
	if (xhr.responseText.indexOf('session: time-out') != -1) {
		alert("Please login again. Session timed-out");
		return;
	}
	var logfile = xhr.responseText;
	// poll until finished
	var timer;

	var oldLength = 0;
	var processCounter = 0;
	var readLogCallPending = false;
	var periodicLogLoad = function(xhr2, status2) {
		if (timer)
			clearTimeout(timer);
		timer = setTimeout(periodicLogLoad, 5000);

		if (readLogCallPending)
			return;
		readLogCallPending = true;
		var readLogurl = wgServer + wgScriptPath
				+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
				+ encodeURIComponent(logfile);
		$
				.ajax( {
					url : readLogurl,
					dataType : "json",
					complete : function(xhr3, status3) {
						readLogCallPending = false;
						var resultLog = xhr3.responseText;
						var length = resultLog.length;
						resultLog = resultLog.substr(oldLength);
						oldLength = length;
						resultLog += '<br><a id="df_finalization_console_log_link" target="_blank" href="'
								+ wgServer
								+ wgScriptPath
								+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
								+ encodeURIComponent(logfile + ".console_out")
								+ '">'
								+ dfgWebAdminLanguage
										.getMessage('df_webadmin_finalization_console_log')
								+ '</a>';
						if (resultLog != '') {
							resultLog += '<img id="df_progress_indicator" src="skins/ajax-loader.gif"/>';
							var dialog = $('#df_install_dialog');
							$('#df_progress_indicator').remove();
							$('#df_finalization_console_log_link').remove();
							resultLog = resultLog.replace(/__OK__/, "");
							dialog[0].innerHTML += resultLog;
							dialog[0].scrollTop = dialog[0].scrollHeight;
						}
						if (xhr3.responseText.indexOf("__OK__") != -1
								|| xhr3.responseText.indexOf("$$NOTEXISTS$$") != -1
								|| xhr3.responseText.indexOf("$$ERROR$$") != -1) {
							clearTimeout(timer);
							$('#df_progress_indicator').hide();
							// finished installation
							var $dialog = $('#df_install_dialog');
							$dialog
									.dialog(
											'option',
											'title',
											dfgWebAdminLanguage
													.getMessage('df_webadmin_finished'));
							$dialog.dialog("option", "buttons", {
								"Ok" : function() {
									$(this).dialog("close");
								}
							});
							var operation = $dialog.dialog('option',
									'operation');

							var errorstatus = $dialog.dialog('option',
									'errorstatus');
							if (resultLog.indexOf("$$ERROR$$") != -1
									|| errorstatus == 'true') {
								dialog[0].innerHTML += "<br/><br/>"
										+ dfgWebAdminLanguage
												.getMessage('df_webadmin_'
														+ operation
														+ '_failure');
							} else if (resultLog.indexOf("$$NOTEXISTS$$") != -1) {
								dialog[0].innerHTML += "<br/><br/>"
										+ dfgWebAdminLanguage
												.getMessage('df_webadmin_'
														+ operation
														+ '_brokenlog');
							} else {
								dialog[0].innerHTML += "<br/><br/>"
										+ dfgWebAdminLanguage
												.getMessage('df_webadmin_'
														+ operation
														+ '_successful');
							}
							// make sure it is visible
							dialog[0].scrollTop = dialog[0].scrollHeight;
						}
						$('.ui-dialog-titlebar-close').show();
					}
				});

		if (dfgOS != 'Windows XP') {
			// this call checks periodically if there is at least on PHP process
			// running
			var isProcessRunningUrl = wgServer
					+ wgScriptPath
					+ "/deployment/tools/webadmin/index.php?rs=isProcessRunning&rsargs[]=php";
			$
					.ajax( {
						url : isProcessRunningUrl,
						dataType : "json",
						complete : function(xhr3, status3) {
							if (xhr3.responseText == "false") {
								processCounter++;
								if (processCounter > 5) {
									processCounter = 0;
									$('.ui-dialog-titlebar-close').show();
									var dialog = $('#df_install_dialog');
									dialog[0].innerHTML += "<br/>Seems that operation is not running anymore... You might close the window.";
									dialog[0].scrollTop = dialog[0].scrollHeight;
								}
							}
						}
					});
		}

	};
	setTimeout(periodicLogLoad, 3000);
}

/**
 * Called when install process has been started.
 * 
 * @param xhr
 *            HTTP responseObject
 * @param int
 *            status HTTP response code
 */
$.webAdmin.operations.installStarted = function(xhr, status) {
	
	var globalSettings = $.webAdmin.settings.getSettings();
	
	if (xhr.responseText.indexOf('session: time-out') != -1) {
		alert("Please login again. Session timed-out");
		return;
	}
	var logfile = xhr.responseText;

	// poll log until finished
	var timer;
	var readLogCallPending = false;
	var periodicLogLoad = function(xhr2, status2) {
		if (timer)
			clearTimeout(timer);
		timer = setTimeout(periodicLogLoad, 5000);

		if (readLogCallPending)
			return;
		readLogCallPending = true;
		var readLogurl = wgServer + wgScriptPath
				+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
				+ encodeURIComponent(logfile);
		$
				.ajax( {
					url : readLogurl,
					dataType : "json",
					complete : function(xhr3, status3) {
						readLogCallPending = false;
						var resultLog = xhr3.responseText;
						resultLog += '<br><a id="df_console_log_link" target="_blank" href="'
								+ wgServer
								+ wgScriptPath
								+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
								+ encodeURIComponent(logfile + ".console_out")
								+ '">'
								+ dfgWebAdminLanguage
										.getMessage('df_webadmin_console_log')
								+ '</a>';
						if (resultLog != '') {
							resultLog += '<img id="df_progress_indicator" src="skins/ajax-loader.gif"/>';
							var dialog = $('#df_install_dialog');
							resultLog = resultLog.replace(/__OK__/, "");
							dialog[0].innerHTML = resultLog;
							dialog[0].scrollTop = dialog[0].scrollHeight;
						}
						if (xhr3.responseText.indexOf("__OK__") != -1
								|| xhr3.responseText.indexOf("$$NOTEXISTS$$") != -1) {
							clearTimeout(timer);
							$('#df_progress_indicator').hide();
							// start finalize
							var globalSettings = $.toJSON($.webAdmin.settings.getSettings());
							var finalizeurl = wgServer
									+ wgScriptPath
									+ "/deployment/tools/webadmin/index.php?rs=finalize&rsargs[]=&rsargs[]="+encodeURIComponent(globalSettings);
							$.ajax( {
								url : finalizeurl,
								dataType : "json",
								complete : $.webAdmin.operations.finalizeStarted
							});
						}

						if (xhr3.responseText.indexOf("$$ERROR$$") != -1) {
							clearTimeout(timer);
							$('#df_progress_indicator').hide();
							var $dialog = $('#df_install_dialog');
							$dialog
									.dialog(
											'option',
											'title',
											dfgWebAdminLanguage
													.getMessage('df_webadmin_finished'));
							$dialog.dialog('option', 'errorstatus', 'true');

							// start finalize
							var globalSettings = $.toJSON($.webAdmin.settings.getSettings());
							var finalizeurl = wgServer
									+ wgScriptPath
									+ "/deployment/tools/webadmin/index.php?rs=finalize&rsargs[]=&rsargs[]="+encodeURIComponent(globalSettings);
							$.ajax( {
								url : finalizeurl,
								dataType : "json",
								complete : $.webAdmin.operations.finalizeStarted
							});
						}

					}
				});

	};
	setTimeout(periodicLogLoad, 3000);

};

/**
 * Called when de-install process has been started.
 * 
 * @param xhr
 *            HTTP responseObject
 * @param int
 *            status HTTP response code
 */
$.webAdmin.operations.deinstallStarted = function(xhr, status) {
	if (xhr.responseText.indexOf('session: time-out') != -1) {
		alert("Please login again. Session timed-out");
		return;
	}
	var logfile = xhr.responseText;

	// poll log until finished
	var timer;
	var readLogCallPending = false;
	var periodicLogLoad = function(xhr2, status2) {
		if (timer)
			clearTimeout(timer);
		timer = setTimeout(periodicLogLoad, 5000);

		if (readLogCallPending)
			return;
		readLogCallPending = true;
		var readLogurl = wgServer + wgScriptPath
				+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
				+ encodeURIComponent(logfile);
		$
				.ajax( {
					url : readLogurl,
					dataType : "json",
					complete : function(xhr3, status3) {
						readLogCallPending = false;
						var resultLog = xhr3.responseText;
						resultLog += '<br><a id="df_console_log_link" target="_blank" href="'
								+ wgServer
								+ wgScriptPath
								+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
								+ encodeURIComponent(logfile + ".console_out")
								+ '">'
								+ dfgWebAdminLanguage
										.getMessage('df_webadmin_console_log')
								+ '</a>';
						if (resultLog != '') {
							resultLog += '<img id="df_progress_indicator" src="skins/ajax-loader.gif"/>';
							var dialog = $('#df_install_dialog');
							resultLog = resultLog.replace(/__OK__/, "");
							dialog[0].innerHTML = resultLog;
							dialog[0].scrollTop = dialog[0].scrollHeight;
						}
						if (xhr3.responseText.indexOf("__OK__") != -1
								|| xhr3.responseText.indexOf("$$NOTEXISTS$$") != -1) {
							clearTimeout(timer);
							$('#df_progress_indicator').hide();
							// start finalize
							var globalSettings = $.toJSON($.webAdmin.settings.getSettings());
							var finalizeurl = wgServer
									+ wgScriptPath
									+ "/deployment/tools/webadmin/index.php?rs=finalize&rsargs[]=&rsargs[]="+encodeURIComponent(globalSettings);
							$.ajax( {
								url : finalizeurl,
								dataType : "json",
								complete : $.webAdmin.operations.finalizeStarted
							});
						}

						if (xhr3.responseText.indexOf("$$ERROR$$") != -1) {
							clearTimeout(timer);
							$('#df_progress_indicator').hide();
							var $dialog = $('#df_install_dialog');
							$dialog
									.dialog(
											'option',
											'title',
											dfgWebAdminLanguage
													.getMessage('df_webadmin_finished'));
							$dialog.dialog('option', 'errorstatus', 'true');
							$('.ui-dialog-titlebar-close').show();
						}

					}
				});

	};
	setTimeout(periodicLogLoad, 3000);

};

/**
 * Called when update process has been started (no global update).
 * 
 * @param xhr
 *            HTTP responseObject
 * @param int
 *            status HTTP response code
 */
$.webAdmin.operations.updateStarted = function(xhr, status) {
	
	var globalSettings = $.webAdmin.settings.getSettings();
	
	if (xhr.responseText.indexOf('session: time-out') != -1) {
		alert("Please login again. Session timed-out");
		return;
	}
	var logfile = xhr.responseText;

	// poll log until finished
	var timer;
	var readLogCallPending = false;
	var periodicLogLoad = function(xhr2, status2) {
		if (timer)
			clearTimeout(timer);
		timer = setTimeout(periodicLogLoad, 5000);

		if (readLogCallPending)
			return;
		readLogCallPending = true;
		var readLogurl = wgServer + wgScriptPath
				+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
				+ encodeURIComponent(logfile);
		$
				.ajax( {
					url : readLogurl,
					dataType : "json",
					complete : function(xhr3, status3) {
						readLogCallPending = false;
						var resultLog = xhr3.responseText;
						resultLog += '<br><a id="df_console_log_link" target="_blank" href="'
								+ wgServer
								+ wgScriptPath
								+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
								+ encodeURIComponent(logfile + ".console_out")
								+ '">'
								+ dfgWebAdminLanguage
										.getMessage('df_webadmin_console_log')
								+ '</a>';
						if (resultLog != '') {
							resultLog += '<img id="df_progress_indicator" src="skins/ajax-loader.gif"/>';
							var dialog = $('#df_install_dialog');
							resultLog = resultLog.replace(/__OK__/, "");
							dialog[0].innerHTML = resultLog;
							dialog[0].scrollTop = dialog[0].scrollHeight;
						}
						if (xhr3.responseText.indexOf("__OK__") != -1
								|| xhr3.responseText.indexOf("$$NOTEXISTS$$") != -1) {
							clearTimeout(timer);
							$('#df_progress_indicator').hide();
							// start finalize
							var globalSettings = $.toJSON($.webAdmin.settings.getSettings());
							var finalizeurl = wgServer
									+ wgScriptPath
									+ "/deployment/tools/webadmin/index.php?rs=finalize&rsargs[]=&rsargs[]="+encodeURIComponent(globalSettings);
							$.ajax( {
								url : finalizeurl,
								dataType : "json",
								complete : $.webAdmin.operations.finalizeStarted
							});
						}

						if (xhr3.responseText.indexOf("$$ERROR$$") != -1) {
							clearTimeout(timer);
							$('#df_progress_indicator').hide();
							var $dialog = $('#df_install_dialog');
							$dialog
									.dialog(
											'option',
											'title',
											dfgWebAdminLanguage
													.getMessage('df_webadmin_finished'));
							$dialog.dialog('option', 'errorstatus', 'true');
							$dialog.dialog("option", "buttons", {
								"Ok" : function() {
									$(this).dialog("close");
								}
							});
						}

					}
				});

	};
	setTimeout(periodicLogLoad, 3000);

};

/**
 * Called when the global update process has been started.
 * 
 * @param xhr
 *            HTTP responseObject
 * @param int
 *            status HTTP response code
 */
$.webAdmin.operations.globalUpdateStarted = function(xhr, status) {
	if (xhr.responseText.indexOf('session: time-out') != -1) {
		alert("Please login again. Session timed-out");
		return;
	}
	var logfile = xhr.responseText;

	// poll log until finished
	var timer;
	var readLogCallPending = false;
	var periodicLogLoad = function(xhr2, status2) {
		if (timer)
			clearTimeout(timer);
		timer = setTimeout(periodicLogLoad, 5000);

		if (readLogCallPending)
			return;
		readLogCallPending = true;
		var readLogurl = wgServer + wgScriptPath
				+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
				+ encodeURIComponent(logfile);
		$
				.ajax( {
					url : readLogurl,
					dataType : "json",
					complete : function(xhr3, status3) {
						readLogCallPending = false;
						var resultLog = xhr3.responseText;
						resultLog += '<br><a id="df_console_log_link" target="_blank" href="'
								+ wgServer
								+ wgScriptPath
								+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
								+ encodeURIComponent(logfile + ".console_out")
								+ '">'
								+ dfgWebAdminLanguage
										.getMessage('df_webadmin_console_log')
								+ '</a>';
						if (resultLog != '') {
							resultLog += '<img id="df_progress_indicator" src="skins/ajax-loader.gif"/>';
							var dialog = $('#df_install_dialog');
							resultLog = resultLog.replace(/__OK__/, "");
							dialog[0].innerHTML = resultLog;
							dialog[0].scrollTop = dialog[0].scrollHeight;
						}
						if (xhr3.responseText.indexOf("__OK__") != -1
								|| xhr3.responseText.indexOf("$$NOTEXISTS$$") != -1) {
							clearTimeout(timer);
							$('#df_progress_indicator').hide();
							// start finalize
							var globalSettings = $.toJSON($.webAdmin.settings.getSettings());
							var finalizeurl = wgServer
									+ wgScriptPath
									+ "/deployment/tools/webadmin/index.php?rs=finalize&rsargs[]=&rsargs[]="+encodeURIComponent(globalSettings);
							$.ajax( {
								url : finalizeurl,
								dataType : "json",
								complete : $.webAdmin.operations.finalizeStarted
							});
						}

						if (xhr3.responseText.indexOf("$$ERROR$$") != -1) {
							clearTimeout(timer);
							$('#df_progress_indicator').hide();
							var $dialog = $('#df_install_dialog');
							$dialog
									.dialog(
											'option',
											'title',
											dfgWebAdminLanguage
													.getMessage('df_webadmin_finished'));
							$dialog.dialog("option", "buttons", {
								"Ok" : function() {
									$(this).dialog("close");
								}
							});
						}

					}
				});

	};
	setTimeout(periodicLogLoad, 3000);

};

/**
 * Called when the extension detail are requested.
 * 
 * @param xhr
 *            HTTP responseObject
 * @param int
 *            status HTTP response code
 */
$.webAdmin.operations.extensionsDetailsStarted = function(xhr, status) {
	if (xhr.responseText.indexOf('session: time-out') != -1) {
		alert("Please login again. Session timed-out");
		return;
	}
	var dd = $.parseJSON(xhr.responseText);

	if (dd.error) {
		$('#df_extension_details')[0].innerHTML = dd.error;
		return;
	}
	var id = dd.id;
	var version = dd.version
	var patchlevel = dd.patchlevel;
	var dependencies = dd.dependencies;
	var maintainer = dd.maintainer != '' ? dd.maintainer : "-";
	var vendor = dd.vendor != '' ? dd.vendor : "-";
	var license = dd.license != '' ? dd.license : "-";
	var helpurl = dd.helpurl != '' ? dd.helpurl : "-";
	var wikidumps = dd.wikidumps;
	var ontologies = dd.ontologies;
	var resources = dd.resources;
	var onlycopyresources = dd.onlycopyresources;
	var notice = dd.notice;

	var i = 0;
	var dependenciesHTML = "<ul class=\"df_enumeration\">";
	$.each(dependencies, function(index, value) {
		var id = value[0];
		var version = value[1];
		dependenciesHTML += "<li>" + id + "-" + version;
		i++;
	});
	dependenciesHTML += "</ul>";
	if (i == 0) {
		dependenciesHTML = "-";
	}

	var wikidumpsHTML = "";
	i = 0;
	if (wikidumps) {
		$.each(wikidumps, function(index, value) {
			var dumpfile = index;
			var titles = value;
			wikidumpsHTML += dumpfile + ":<ul>";
			$.each(titles, function(index, value) {
				var title = value;
				wikidumpsHTML += "<li>" + title + "</li>";
				i++;
			});
			wikidumpsHTML += "</ul>";
		});
	}
	if (i == 0) {
		wikidumpsHTML = "-";
	}

	i = 0;
	var ontologiesHTML = "";
	if (ontologies) {
		$.each(ontologies, function(index, value) {
			var dumpfile = index;
			var titles = value;
			ontologiesHTML += dumpfile + ":<ul class=\"df_enumeration\">";
			$.each(titles, function(index, value) {
				var title = value;
				ontologiesHTML += "<li>" + title + "</li>";
				i++
			});
			ontologiesHTML += "</ul>";
		});
	}
	if (i == 0) {
		ontologiesHTML = "-";
	}

	i = 0;
	var resourcesHTML = "<ul class=\"df_enumeration\">";
	$.each(resources, function(index, value) {
		var file = value;
		resourcesHTML += "<li>" + file + "</li>";
		i++;

	});
	resourcesHTML += "</ul>";
	if (i == 0) {
		resourcesHTML = "-";
	}

	i = 0;
	var resourcesCopyOnlyHTML = "<ul class=\"df_enumeration\">";
	$.each(onlycopyresources, function(index, value) {
		var file = value;
		resourcesCopyOnlyHTML += "<li>" + file + "</li>";
		i++;

	});
	resourcesCopyOnlyHTML += "</ul>";
	if (i == 0) {
		resourcesCopyOnlyHTML = "-";
	}

	var noticeHtml = "";
	if (notice != '') {
		noticeHtml = dfgWebAdminLanguage.getMessage('df_webadmin_checknotice')
				+ ':' + '<pre class="df_notice">'
				+ notice.replace(/\n/g, "<br>") + '</pre>';
	}

	var html = $('#df_extension_details')
			.html(
					'<div>'
							+ noticeHtml
							+ '<table class="df_extension_details" style="width: 100%;">'
							+ '<tr class="df_row_0"><td description="true">'
							+ dfgWebAdminLanguage.getMessage('df_webadmin_id')
							+ '</td><td value="true">'
							+ id
							+ '-'
							+ version
							+ '</td></tr>'
							+ '<tr class="df_row_1"><td description="true">'
							+ dfgWebAdminLanguage
									.getMessage('df_webadmin_patchlevel')
							+ '</td><td value="true">'
							+ patchlevel
							+ '</td></tr>'
							+ '<tr class="df_row_0"><td description="true">'
							+ dfgWebAdminLanguage
									.getMessage('df_webadmin_dependencies')
							+ '</td><td value="true">'
							+ dependenciesHTML
							+ '</td></tr>'
							+ '<tr class="df_row_1"><td description="true">'
							+ dfgWebAdminLanguage
									.getMessage('df_webadmin_maintainer')
							+ '</td><td value="true">'
							+ maintainer
							+ '</td></tr>'
							+ '<tr class="df_row_0"><td description="true">'
							+ dfgWebAdminLanguage
									.getMessage('df_webadmin_vendor')
							+ '</td><td value="true">'
							+ vendor
							+ '</td></tr>'
							+ '<tr class="df_row_1"><td description="true">'
							+ dfgWebAdminLanguage
									.getMessage('df_webadmin_license')
							+ '</td><td value="true">'
							+ license
							+ '</td></tr>'
							+ '<tr class="df_row_0"><td description="true">'
							+ dfgWebAdminLanguage
									.getMessage('df_webadmin_helpurl')
							+ '</td><td value="true"><a href="'
							+ helpurl
							+ '" target="_blank">Help</td></tr>'
							+ '<tr class="df_row_1"><td description="true">'
							+ dfgWebAdminLanguage
									.getMessage('df_webadmin_wikidumps')
							+ '</td><td value="true">'
							+ wikidumpsHTML
							+ '</td></tr>'
							+ '<tr class="df_row_0"><td description="true">'
							+ dfgWebAdminLanguage
									.getMessage('df_webadmin_ontologies')
							+ '</td><td value="true">'
							+ ontologiesHTML
							+ '</td></tr>'
							+ '<tr class="df_row_1"><td description="true">'
							+ dfgWebAdminLanguage
									.getMessage('df_webadmin_resources')
							+ '</td><td value="true">'
							+ resourcesHTML
							+ '</td></tr>'
							+ '<tr class="df_row_0"><td description="true">'
							+ dfgWebAdminLanguage
									.getMessage('df_webadmin_resourcecopyonly')
							+ '</td><td value="true">' + resourcesCopyOnlyHTML
							+ '</td></tr>' + '</table></div>');

};

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
 * @file
 * @ingroup WebAdmin
 *
 * webadmin scripts for DF_ContentBundleTab
 *
 * @author: Kai Kühn
 *
 */

$(document)
		.ready(
				function(e) {
					$('#df_bundles_list').change(function() {
						$('#df_createBundle').attr('disabled', false);
					});
					$('#df_createBundle')
							.click(
									function() {
										var selectedBundle = $('#df_bundlename')
												.val();
										if (!selectedBundle) {
											selectedBundle = $(
													"#df_bundles_list option:selected")
													.text();
										}
										if (selectedBundle == '') {
											alert(dfgWebAdminLanguage
													.getMessage('df_webadmin_emptybundlename'));
											return;
										}
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=createBundle&rsargs[]="
												+ encodeURIComponent(selectedBundle);
										$('#df_bundleexport_progress_indicator')
												.show();
										$('#df_createBundle').attr('disabled',
												true);
										$
												.ajax( {
													url : url,
													dataType : "json",
													complete : function(xhr,
															status) {
														$(
																'#df_bundleexport_progress_indicator')
																.hide();
														$('#df_createBundle')
																.attr(
																		'disabled',
																		false);
														var result = $
																.parseJSON(xhr.responseText);
														if (result.returnCode != 0) {
															$(
																	'#df_contentbundle_error')
																	.html(
																			dfgWebAdminLanguage
																					.getMessage('df_webadmin_contentbundle_error')
																					+ '<a target="_blank" href="'
																					+ wgServer
																					+ wgScriptPath
																					+ '/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]='
																					+ result.outputFile
																					+ '&rsargs[]=text">log</a>.');
															return;
														} else {
															// ok, remove error
															// hint if any
															$(
																	'#df_contentbundle_error')
																	.html('');
														}
														window.location.href = wgServer
																+ wgScriptPath
																+ "/deployment/tools/webadmin/index.php?tab=8";
													}
												});
									});
				});/*
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
 * @file
 * @ingroup WebAdmin
 *
 * webadmin scripts for general functionality
 *
 * @author: Kai Kühn
 *
 */
$(document).ready(function(e) {

	// make tables sortable
	smw_preload_images();
	smw_makeSortable($('#df_statustable')[0]);
	smw_makeSortable($('#df_bundlefilelist_table')[0]);
	smw_makeSortable($('#df_restorepoint_table')[0]);

});/*
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
 * @file
 * @ingroup WebAdmin
 *
 * webadmin scripts for DF_LocalSettingsTab
 *
 * @author: Kai Kühn
 *
 */
$(document)
		.ready(
				function(e) {
					// register LocalSettings content
					$('#df_settings_save_button')
							.click(
									function(e2) {
										// save content
										var saveLocalSettingsCallback = function(
												xhr, status) {
											if (xhr.responseText
													.indexOf('session: time-out') != -1) {
												alert("Please login again. Session timed-out");
												return;
											}
											if (xhr.status == 200) {
												alert(dfgWebAdminLanguage
														.getMessage('df_webadmin_save_ok'));
												$('#df_settings_save_button')
														.attr('disabled', true);
											} else {
												alert(dfgWebAdminLanguage
														.getMessage('df_webadmin_save_failed'));
											}
										};
										var fragment = $(
												'#df_settings_textfield').val();
										var selectedId = $(
												"#df_settings_extension_selector option:selected")
												.text();
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php";
										$
												.ajax( {
													url : url,
													type : "POST",
													data : {
														"rs" : "saveLocalSettingFragment",
														"rsargs[]" : [
																selectedId,
																fragment ]
													},
													dataType : "json",
													complete : saveLocalSettingsCallback
												});
									});

					$('#df_settings_textfield')
							.keydown(
									function(e2) {
										// activate save button
										var selectedId = $(
												"#df_settings_extension_selector option:selected")
												.text();
										if (selectedId == dfgWebAdminLanguage
												.getMessage('df_webadmin_select_extension')) {
											return;
										}
										$('#df_settings_save_button').attr(
												'disabled', false);

									});

					$('#df_settings_extension_selector')
							.change(
									function(e2) {
										// load content

										var getLocalSettingsCallback = function(
												xhr, status) {
											if (xhr.responseText
													.indexOf('session: time-out') != -1) {
												alert("Please login again. Session timed-out");
												return;
											}
											if (xhr.status != 200) {
												$('#df_settings_textfield')
														.val("");
												$('#df_settings_textfield')
														.attr('disabled', true);
												alert(dfgWebAdminLanguage
														.getMessage('df_webadmin_fragment_not_found'));
												return;
											}
											$('#df_settings_textfield').attr(
													'disabled', false);
											$('#df_settings_textfield').val(
													xhr.responseText);
										};
										$('#df_settings_save_button').attr(
												'disabled', true);
										var selectedId = $(
												"#df_settings_extension_selector option:selected")
												.text();
										if (selectedId == dfgWebAdminLanguage
												.getMessage('df_webadmin_select_extension')) {
											$('#df_settings_textfield').attr(
													'disabled', true);
											$('#df_settings_textfield').val("");
											return;
										}
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=getLocalSettingFragment&rsargs[]="
												+ encodeURIComponent(selectedId);
										$.ajax( {
											url : url,
											dataType : "json",
											complete : getLocalSettingsCallback
										});
									});

				});/*
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
 * @file
 * @ingroup WebAdmin
 *
 * webadmin scripts for DF_LogsTab
 *
 * @author: Kai Kühn
 *
 */
$(document)
		.ready(
				function(e) {
					$('#df_clearlog')
							.click(
									function() {
										var doClear = confirm(dfgWebAdminLanguage
												.getMessage('df_webadmin_really_clear_log'));
										if (!doClear)
											return;
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=clearLog";
										$
												.ajax( {
													url : url,
													dataType : "json",
													complete : function() {
														window.location.href = wgServer
																+ wgScriptPath
																+ "/deployment/tools/webadmin/index.php?tab=7";
													}
												});
									});
				});/*
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
 * @file
 * @ingroup WebAdmin
 *
 * webadmin scripts for DF_MaintenanceTab
 *
 * @author: Kai Kühn
 *
 */

/**
 * Called when restore process has been started.
 * 
 * @param xhr
 *            HTTP responseObject
 * @param int
 *            status HTTP response code
 */
$.webAdmin.operations.restoreStarted = function(xhr, status) {
	if (xhr.responseText.indexOf('session: time-out') != -1) {
		alert("Please login again. Session timed-out");
		return;
	}
	var logfile = xhr.responseText;

	// poll log until finished
	var timer;
	var readLogCallPending = false;
	var periodicLogLoad = function(xhr2, status2) {
		if (timer)
			clearTimeout(timer);
		timer = setTimeout(periodicLogLoad, 5000);

		if (readLogCallPending)
			return;
		readLogCallPending = true;
		var readLogurl = wgServer + wgScriptPath
				+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
				+ encodeURIComponent(logfile);
		$
				.ajax( {
					url : readLogurl,
					dataType : "json",
					complete : function(xhr3, status3) {
						readLogCallPending = false;
						var resultLog = xhr3.responseText;
						resultLog += '<br><a id="df_console_log_link" target="_blank" href="'
								+ wgServer
								+ wgScriptPath
								+ "/deployment/tools/webadmin/index.php?rs=readLog&rsargs[]="
								+ encodeURIComponent(logfile + ".console_out")
								+ '">'
								+ dfgWebAdminLanguage
										.getMessage('df_webadmin_console_log')
								+ '</a>';
						if (resultLog != '') {
							resultLog += '<img id="df_progress_indicator" src="skins/ajax-loader.gif"/>';
							var dialog = $('#df_install_dialog');
							resultLog = resultLog.replace(/__OK__/, "");
							dialog[0].innerHTML = resultLog;
							dialog[0].scrollTop = dialog[0].scrollHeight;
						}
						if (xhr3.responseText.indexOf("__OK__") != -1
								|| xhr3.responseText.indexOf("$$NOTEXISTS$$") != -1
								|| xhr3.responseText.indexOf("$$ERROR$$") != -1) {
							clearTimeout(timer);
							$('#df_progress_indicator').hide();
							var dialog = $('#df_install_dialog');
							dialog
									.dialog(
											'option',
											'title',
											dfgWebAdminLanguage
													.getMessage('df_webadmin_finished'));

							dialog.dialog("option", "buttons", {
								"Ok" : function() {
									$(this).dialog("close");
								}
							});
							var operation = $dialog.dialog('option',
									'operation');

							if (resultLog.indexOf("$$ERROR$$") != -1) {
								dialog[0].innerHTML += "<br/><br/>"
										+ dfgWebAdminLanguage
												.getMessage('df_webadmin_'
														+ operation
														+ '_failure');
							} else {
								dialog[0].innerHTML += "<br/><br/>"
										+ dfgWebAdminLanguage
												.getMessage('df_webadmin_'
														+ operation
														+ '_successful');
							}
							// make sure it is visible
							dialog[0].scrollTop = dialog[0].scrollHeight;
						}

					}
				});

	};
	setTimeout(periodicLogLoad, 3000);

};

/**
 * Called when "Create" button on the maintenance tab is clicked or enter is
 * pressed in the restore point name input field.
 * 
 * @param e
 *            event
 */
$.webAdmin.operations.restoreHandler = function(e) {
	var restorepoint = $('#df_restorepoint').val();
	var url = wgServer
			+ wgScriptPath
			+ "/deployment/tools/webadmin/index.php?rs=createRestorePoint&rsargs[]="
			+ encodeURIComponent(restorepoint);
	var $dialog = $('#df_install_dialog').dialog(
			{
				autoOpen : false,
				title : dfgWebAdminLanguage
						.getMessage('df_webadmin_pleasewait'),
				modal : true,
				width : 800,
				height : 500,
				close : function(event, ui) {
					window.location.href = wgServer + wgScriptPath
							+ "/deployment/tools/webadmin/index.php?tab=3";

				}
			});
	$dialog.html("<div></div>");
	$dialog.dialog('open');
	$dialog.html('<img src="skins/ajax-loader.gif"/>');
	$('.ui-dialog-titlebar-close').hide();
	$.ajax( {
		url : url,
		dataType : "json",
		complete : $.webAdmin.operations.restoreStarted
	});
}

$(document)
		.ready(
				function(e) {
					// register restore handler
					$('#df_create_restorepoint').click(
							$.webAdmin.operations.restoreHandler);
					$('#df_restorepoint').keypress(function(e) {
						if (e.keyCode == 13) {
							$.webAdmin.operations.restoreHandler(e);
						}
					});

					// register restore buttons
					$('.df_restore_button')
							.click(
									function(e) {
										var restorepoint = $(e.currentTarget)
												.attr('id');
										restorepoint = restorepoint.split("__")[1];

										$("#restore-dialog-confirm")
												.dialog(
														{
															resizable : false,
															height : 350,
															modal : true,
															buttons : [
																	{
																		text : dfgWebAdminLanguage
																				.getMessage('df_yes'),
																		click : function() {
																			$(
																					this)
																					.dialog(
																							"close");

																			var url = wgServer
																					+ wgScriptPath
																					+ "/deployment/tools/webadmin/index.php?rs=restore&rsargs[]="
																					+ encodeURIComponent(restorepoint);
																			var $dialog = $(
																					'#df_install_dialog')
																					.dialog(
																							{
																								autoOpen : false,
																								title : dfgWebAdminLanguage
																										.getMessage('df_webadmin_pleasewait'),
																								modal : true,
																								width : 800,
																								height : 500,
																								close : function(
																										event,
																										ui) {
																									window.location.href = wgServer
																											+ wgScriptPath
																											+ "/deployment/tools/webadmin/index.php?tab=0";

																								}
																							});
																			$dialog
																					.html("<div></div>");
																			$dialog
																					.dialog('open');
																			$dialog
																					.html('<img src="skins/ajax-loader.gif"/>');
																			$(
																					'.ui-dialog-titlebar-close')
																					.hide();
																			$
																					.ajax( {
																						url : url,
																						dataType : "json",
																						complete : $.webAdmin.operations.restoreStarted
																					});

																		}
																	},
																	{
																		text : dfgWebAdminLanguage
																				.getMessage('df_no'),
																		click : function() {
																			$(
																					this)
																					.dialog(
																							"close");
																		}
																	} ]

														});

									});

					$('.df_remove_restore_button')
							.click(
									function(e) {
										var restorepoint = $(e.currentTarget)
												.attr('id');
										restorepoint = restorepoint.split("__")[1];
										$("#remove-restore-dialog-confirm")
												.dialog(
														{
															resizable : false,
															height : 350,
															modal : true,
															buttons : [
																	{
																		text : dfgWebAdminLanguage
																				.getMessage('df_yes'),
																		click : function() {
																			$(
																					this)
																					.dialog(
																							"close");

																			var url = wgServer
																					+ wgScriptPath
																					+ "/deployment/tools/webadmin/index.php?rs=removeRestorePoint&rsargs[]="
																					+ encodeURIComponent(restorepoint);
																			var $dialog = $(
																					'#df_install_dialog')
																					.dialog(
																							{
																								autoOpen : false,
																								title : dfgWebAdminLanguage
																										.getMessage('df_webadmin_pleasewait'),
																								modal : true,
																								width : 800,
																								height : 500,
																								close : function(
																										event,
																										ui) {
																									window.location.href = wgServer
																											+ wgScriptPath
																											+ "/deployment/tools/webadmin/index.php?tab=0";

																								}
																							});
																			$dialog
																					.html("<div></div>");
																			$dialog
																					.dialog('open');
																			$dialog
																					.html('<img src="skins/ajax-loader.gif"/>');
																			$(
																					'.ui-dialog-titlebar-close')
																					.hide();
																			$
																					.ajax( {
																						url : url,
																						dataType : "json",
																						complete : $.webAdmin.operations.restoreStarted
																					});

																		}
																	},
																	{
																		text : dfgWebAdminLanguage
																				.getMessage('df_no'),
																		click : function() {
																			$(
																					this)
																					.dialog(
																							"close");
																		}
																	} ]

														});
									});
				});/*
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
 * @file
 * @ingroup WebAdmin
 * 
 * webadmin scripts for DFProfilerTab
 * 
 * @author: Kai Kühn
 * 
 */
$(document).ready(
		function(e) {

			var profilingEnabled = false;
			var currentLog = [];
			var currentRequests = null;
			
			// intialize, check if profiling is enabled 
			var url = wgServer
			+ wgScriptPath
			+ "/deployment/tools/webadmin/index.php?rs=getProfilingState";
			$.ajax( {
				url : url,
				dataType : "json",
				complete : function(xhr,
						status) {
					if (xhr.status == 200) {
						profilingEnabled = (xhr.responseText !== "false");
						if (profilingEnabled) {
							$('#df_webadmin_profiler_content').show();
						} else {
							$('#df_webadmin_profiler_content').hide();
						}
						$('#df_enableprofiling').attr("disabled", false);
						$('#df_enableprofiling').attr("value",
								profilingEnabled ? dfgWebAdminLanguage
										.getMessage('df_webadmin_disableprofiling') : dfgWebAdminLanguage
										.getMessage('df_webadmin_enableprofiling'));
						
						$('#df_webadmin_profiler_content input').attr("disabled", !profilingEnabled);
					}
				}
			});
			
			// enable/disable profiling button
			$('#df_enableprofiling').click(
					function() {
						
						$('#df_enableprofiling').attr("disabled", true);
						var url = wgServer
						+ wgScriptPath
						+ "/deployment/tools/webadmin/index.php?rs=switchProfiling&rsargs[]="
						+ (profilingEnabled ? "false" : "true");
						$.ajax( {
							url : url,
							dataType : "json",
							complete : function(xhr,
									status) {
								$('#df_enableprofiling').attr("disabled", false);
								if (xhr.status == 200) {
									if (!profilingEnabled) {
										currentLog = logParser.splitLog(xhr.responseText);

										var html = logParser.createTable(currentLog);
										$('#df_webadmin_profilerlog').html(html);
									}
									$('#df_enableprofiling').attr("value",
											profilingEnabled ? dfgWebAdminLanguage
													.getMessage('df_webadmin_enableprofiling') : dfgWebAdminLanguage
													.getMessage('df_webadmin_disableprofiling'));
									//$('#df_webadmin_profiler_content textarea').attr("disabled", profilingEnabled);
									$('#df_webadmin_profiler_content input').attr("disabled", profilingEnabled);
									profilingEnabled = !profilingEnabled;
								} else {
									alert(xhr.responseText);
								}
								if (profilingEnabled) {
									$('#df_webadmin_profiler_content').show();
								} else {
									$('#df_webadmin_profiler_content').hide();
								}
						}
						});
			});
			
			// refresh profiling requests button
			$('#df_refreshprofilinglog').click(function() { 
				var url = wgServer
				+ wgScriptPath
				+ "/deployment/tools/webadmin/index.php?rs=getProfilingLogIndices";
				$.ajax( {
					url : url,
					dataType : "json",
					complete : function(xhr,
							status) {
					$('#df_webadmin_profiler_refresh_progress_indicator').hide();
						var html = "";
						var result = $.parseJSON(xhr.responseText);
						var indices = result.indices;
						var filesize = result.filesize;
						var oldIndex = 0;
						$.each(indices, function(i, e) { 
							var index = e[0];
							var logUrl = e[1];
							if (logUrl == '') return;
							html += "<option from=\""+index+"\" to=\""+oldIndex+"\">"+$('<div/>').text(logUrl).html();+"</option>";
							oldIndex = index;
							
						});
						$('#df_webadmin_profiler_selectlog').attr("logfilesize", filesize);
						
						$('#df_webadmin_profiler_selectlog').html(html);
						currentRequests = [];
						$('#df_webadmin_profiler_selectlog option').each(function(e, i) {
							currentRequests.push($(e));
						});
					}
				});
				$('#df_webadmin_profiler_refresh_progress_indicator').show();
			});
			
			// filter input field
			var timeout = null;
			$('#df_profiler_filtering').keydown(function() {
				if (timeout != null) clearTimeout(timeout);
				timeout = setTimeout(function() { 
					var searchFor = $('#df_profiler_filtering').val().toLowerCase();
					
					var selectedLines = $.grep(currentLog, function(l, i) { 
						return (l.text.toLowerCase().indexOf(searchFor) != -1);
					});
				
					
					var html = logParser.createTable(selectedLines);
					var table = $('#df_webadmin_profilerlog');
					table.empty();
					table.html(html);
					
					$('#df_webadmin_profilerlog').html(html);
					
				}, 500);
			});
			
			var timeoutRequestFiltering = null;
			$('#df_profiler_requests_filtering').keydown(function() {
				if (timeoutRequestFiltering != null) clearTimeout(timeoutRequestFiltering);
				timeoutRequestFiltering = setTimeout(function() { 
					var searchFor = $('#df_profiler_requests_filtering').val().toLowerCase();
					
					if (currentRequests == null) {
						// initialize with current set
						currentRequests = [];
						$('#df_webadmin_profiler_selectlog option').each(function(i, e) {
							currentRequests.push($(e));
						});
					}
					var selectBox = $('#df_webadmin_profiler_selectlog');
					selectBox.empty();
					var selectedLines = $.each(currentRequests, function(i, l) { 
						if (l.text().toLowerCase().indexOf(searchFor) != -1) {
							selectBox.append(l[0]);
						}
					});
					
				}, 500);
			});
			
			
			// select a request from list
			$('#df_webadmin_profiler_selectlog').change(function(e) {  
				var from = $(
				"#df_webadmin_profiler_selectlog option:selected")
				.attr("from");
				var to = $(
				"#df_webadmin_profiler_selectlog option:selected")
				.attr("to");
				var logfilesize = $(
				"#df_webadmin_profiler_selectlog")
				.attr("logfilesize");
				var url = wgServer
				+ wgScriptPath
				+ "/deployment/tools/webadmin/index.php?rs=getProfilingLog&rsargs[]="+from+"&rsargs[]="+to+"&rsargs[]="+logfilesize;
				$.ajax( {
					url : url,
					dataType : "json",
					complete : function(xhr,
							status) {
					currentLog = logParser.splitLog(xhr.responseText);
					var html = logParser.createTable(currentLog);
					var table = $('#df_webadmin_profilerlog');
					table.empty();
					table.html(html);
					$('#df_webadmin_profiler_progress_indicator').hide();
					}
				});
				$('#df_webadmin_profiler_progress_indicator').show();
				var table = $('#df_webadmin_profilerlog');
				table.empty();
			});
			
			// clear profiling requests button
			$('#df_clearprofilinglog').click(function() { 
				var url = wgServer
				+ wgScriptPath
				+ "/deployment/tools/webadmin/index.php?rs=clearProfilingLog";
				$.ajax( {
					url : url,
					dataType : "json",
					complete : function(xhr,
							status) {
					$('#df_webadmin_profiler_refresh_progress_indicator').hide();
					if (xhr.status == 200) {
						var table = $('#df_webadmin_profiler_selectlog').empty();
					} else {
						alert("Error on clear log");
					}
					}
				});
				$('#df_webadmin_profiler_refresh_progress_indicator').show();
			});
			
			// logging parser
			var logParser = {};
			logParser.parseLine = function(line) {
				var COLUMN = /\s\s\s/g;
				var matches = line.split(COLUMN);
				if (matches == null || matches.length < 6) return { text: null };
				matches = $.grep(matches, function(e) { 
					return $.trim(e) != '';
				});
				//  Calls         Total          Each             %       Mem
				return { text: matches[0], calls: parseInt(matches[1]), total: parseFloat(matches[2]), 
						each : parseFloat(matches[3]), percentage : parseFloat(matches[4]), mem : parseFloat(matches[5]) };
			}
			
			logParser.splitLog = function(log) {
				var lines = log.split("\n");
				var logArray = [];
				$.each(lines, function(i, l) {
					var nums = logParser.parseLine(l);
					if (nums.text == null ) return;
					logArray.push(nums);
				});
				return logArray;
			} 
			
					
			logParser.createTable = function(logArray) {
			
				var html = "";
				html += "<tr>";
				html += "<th>Function</th>";
				html += "<th>Calls</th>";
				html += "<th>Total</th>";
				html += "<th>Each</th>";
				html += "<th>Percentage</th>";
				html += "<th>Mem</th>";
				html += "</tr>";
				$.each(logArray, function(i, l) { 
					
					html += "<tr>";
					html += "<td>"+l.text+"</td>";
					html += "<td>"+l.calls+"</td>";
					html += "<td>"+l.total+"</td>";
					html += "<td>"+l.each+"</td>";
					html += "<td>"+l.percentage+"</td>";
					html += "<td>"+l.mem+"</td>";
					html += "</tr>";
				});
				return html;
			}
});/*
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
 * @file
 * @ingroup WebAdmin
 *
 * webadmin scripts for DF_RepositoriesTab
 * 	
 * @author: Kai Kühn
 *
 */
// register repository managment handler
$.webAdmin.operations.addRepositoryHandler = function() {
	var newrepositoryURL = $('#df_newrepository_input').val();
	newrepositoryURL = newrepositoryURL.replace('<', '&lt;');
	newrepositoryURL = newrepositoryURL.replace('&', '&amp;');

	var addToRepositoryCallack = function(xhr, status) {
		if (xhr.responseText.indexOf('session: time-out') != -1) {
			alert("Please login again. Session timed-out");
			return;
		}
		$('#df_settings_progress_indicator').hide();
		if (xhr.status != 200) {
			alert(xhr.responseText);
			return;
		}
		$('#df_repository_list').append(
				$('<option>' + newrepositoryURL + '</option>'));
		window.location.href = wgServer + wgScriptPath
				+ "/deployment/tools/webadmin/index.php?tab=4";
	};
	$('#df_settings_progress_indicator').show();
	var url = wgServer
			+ wgScriptPath
			+ "/deployment/tools/webadmin/index.php?rs=addToRepository&rsargs[]="
			+ encodeURIComponent($('#df_newrepository_input').val());
	$.ajax( {
		url : url,
		dataType : "json",
		complete : addToRepositoryCallack
	});
}

$(document)
		.ready(
				function(e) {
					$('#df_addrepository').click(
							$.webAdmin.operations.addRepositoryHandler);
					$('#df_newrepository_input').keypress(function(e) {
						if (e.keyCode == 13) { // 13 == enter
							$.webAdmin.operations.addRepositoryHandler();
						}
					});
					$('#df_repository_list').change(
							function(e) {
								var selectedURI = $(
										"#df_repository_list option:selected")
										.text();
								$('#df_newrepository_input').val(selectedURI);
							});
					$('#df_removerepository')
							.click(
									function(e) {
										$('#df_repository_list option:selected')
												.each(
														function() {
															var entry = $(this);
															var removeFromRepositoryCallack = function(
																	xhr, status) {
																if (xhr.responseText
																		.indexOf('session: time-out') != -1) {
																	alert("Please login again. Session timed-out");
																	return;
																}
																$(
																		'#df_settings_progress_indicator')
																		.hide();
																if (xhr.status != 200) {
																	alert(xhr.responseText);
																	return;
																}
																entry.remove();
																window.location.href = wgServer
																		+ wgScriptPath
																		+ "/deployment/tools/webadmin/index.php?tab=4";
															};
															$(
																	'#df_settings_progress_indicator')
																	.show();
															var url = wgServer
																	+ wgScriptPath
																	+ "/deployment/tools/webadmin/index.php?rs=removeFromRepository&rsargs[]="
																	+ encodeURIComponent(entry
																			.val());
															$
																	.ajax( {
																		url : url,
																		dataType : "json",
																		complete : removeFromRepositoryCallack
																	});

														});
									});
				});/*
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
 * @file
 * @ingroup WebAdmin
 *
 * webadmin scripts for DF_SearchTab
 * 	
 * @author: Kai Kühn
 *
 */
/**
 * Called when search button is clicked or enter is pressed in the search input
 * field.
 * 
 * @param e
 *            event
 */
$.webAdmin.operations.searchHandler = function(e) {

	// show repositories
	var html = dfgWebAdminLanguage
			.getMessage('df_webadmin_searching_in_repository');
	$('#df_repository_list option').each(
			function(i, element) {
				var url = $(element).val();
				if ($.trim(url).substr(url.length - 1) != "/") {
					url += "/";
				}
				html += '<br><a target="_blank" href="' + url
						+ 'repository.xml">' + url + '</a>';
			});
	$('#df_search_results_header').html(html);

	var callbackHandler = function(html, status, xhr) {

		$('#df_search_progress_indicator').hide();
		smw_makeSortable($('#df_search_results_table')[0]);
		$('.df_install_all').show();
		// register install buttons
		$('.df_install_button')
				.click(
						function(e) {
							var idAttr = $(e.currentTarget).attr('id');
							var parts = idAttr.split("__");
							var id = parts[1];
							var version = parts[2].split("_")[0];
							var patchlevel = parts[2].split("_")[1];
							var url = wgServer
									+ wgScriptPath
									+ "/deployment/tools/webadmin/index.php?rs=getDependencies&rsargs[]="
									+ encodeURIComponent(id) + "&rsargs[]="
									+ encodeURIComponent(version);
							var callbackForExtensions = function(xhr, status) {
								if (xhr.responseText
										.indexOf('session: time-out') != -1) {
									alert("Please login again. Session timed-out");
									return;
								}
								var extensionsToInstall = $
										.parseJSON(xhr.responseText);
								var globalSettings = $
										.toJSON($.webAdmin.settings
												.getSettings());
								var url = wgServer
										+ wgScriptPath
										+ "/deployment/tools/webadmin/index.php?rs=install&rsargs[]="
										+ encodeURIComponent(id + "-" + version)
										+ "&rsargs[]="
										+ encodeURIComponent(globalSettings);

								var $dialog = $('#df_install_dialog')
										.dialog(
												{
													autoOpen : false,
													title : dfgWebAdminLanguage
															.getMessage('df_webadmin_pleasewait'),
													modal : true,
													width : 800,
													height : 500,
													operation : "install",
													close : function(event, ui) {
														window.location.href = wgServer
																+ wgScriptPath
																+ "/deployment/tools/webadmin/index.php?tab=0";

													}
												});
								$dialog.html("<div></div>");

								$dialog.dialog('open');
								$dialog
										.html('<img src="skins/ajax-loader.gif"/>');
								$('.ui-dialog-titlebar-close').hide();
								$
										.ajax( {
											url : url,
											dataType : "json",
											complete : $.webAdmin.operations.installStarted
										});

							};
							$.ajax( {
								url : url,
								dataType : "json",
								complete : callbackForExtensions
							});

						});

		// register check buttons
		$('.df_check_button')
				.click(
						function(e) {
							var idAttr = $(e.currentTarget).attr('id');
							var parts = idAttr.split("__");
							var id = parts[1];
							var version = parts[2].split("_")[0];
							var patchlevel = parts[2].split("_")[1];
							var url = wgServer
									+ wgScriptPath
									+ "/deployment/tools/webadmin/index.php?rs=getDependencies&rsargs[]="
									+ encodeURIComponent(id) + "&rsargs[]="
									+ encodeURIComponent(version);
							var callbackForExtensions = function(xhr, status) {
								if (xhr.responseText
										.indexOf('session: time-out') != -1) {
									alert("Please login again. Session timed-out");
									return;
								}
								var extensionsToInstall = $
										.parseJSON(xhr.responseText);
								var text = "";

								if (extensionsToInstall['exception']) {
									text += extensionsToInstall['exception'][0];
								} else {
									text = dfgWebAdminLanguage
											.getMessage('df_webadmin_wouldbeinstalled');
									text += "<ul>";
									$.each(extensionsToInstall['extensions'],
											function(index, value) {
												var id = value[0];
												var version = value[1];
												text += "<li>" + id + "-"
														+ version + "</li>";
											});
									text += "</ul>";
								}

								$('#check-extension-dialog-text').html(text);
								$("#check-extension-dialog")
										.dialog(
												{
													resizable : false,
													height : 400,
													modal : true,
													buttons : [ {
														text : dfgWebAdminLanguage
																.getMessage('df_webadmin_close'),
														click : function() {
															$(this).dialog(
																	"close");

														}
													} ]

												});
							}
							$.ajax( {
								url : url,
								dataType : "json",
								complete : callbackForExtensions
							});
						});

		$('.df_update_button_search')
				.click(
						function(e2) {
							var idAttr = $(e2.currentTarget).attr('id');
							var parts = idAttr.split("__");
							var id = parts[1];
							var version = parts[2].split("_")[0];
							var patchlevel = parts[2].split("_")[1];
							var dialogText = dfgWebAdminLanguage
									.getMessage('df_webadmin_wouldbeupdated')
							$('#updatedialog-confirm-text').html(
									dialogText + "<ul><li>" + id + "-"
											+ version + "_" + patchlevel
											+ "</li></ul>");
							$("#updatedialog-confirm")
									.dialog(
											{
												resizable : false,
												height : 350,
												modal : true,
												buttons : [
														{
															text : dfgWebAdminLanguage
																	.getMessage('df_webadmin_doupdate'),
															click : function() {
																$(this)
																		.dialog(
																				"close");

																var globalSettings = $
																		.toJSON($.webAdmin.settings
																				.getSettings());
																var url = wgServer
																		+ wgScriptPath
																		+ "/deployment/tools/webadmin/index.php?rs=update&rsargs[]="
																		+ encodeURIComponent(id
																				+ "-"
																				+ version)
																		+ "&rsargs[]="
																		+ encodeURIComponent(globalSettings);
																var $dialog = $(
																		'#df_install_dialog')
																		.dialog(
																				{
																					autoOpen : false,
																					title : dfgWebAdminLanguage
																							.getMessage('df_webadmin_pleasewait'),
																					modal : true,
																					width : 800,
																					height : 500,
																					operation : "update",
																					close : function(
																							event,
																							ui) {
																						window.location.href = wgServer
																								+ wgScriptPath
																								+ "/deployment/tools/webadmin/index.php?tab=0";

																					}
																				});
																$dialog
																		.html("<div></div>");
																$dialog
																		.dialog('open');
																$dialog
																		.html('<img src="skins/ajax-loader.gif"/>');
																$(
																		'.ui-dialog-titlebar-close')
																		.hide();
																$
																		.ajax( {
																			url : url,
																			dataType : "json",
																			complete : $.webAdmin.operations.updateStarted
																		});
															}
														},
														{
															text : dfgWebAdminLanguage
																	.getMessage('df_webadmin_cancel'),
															click : function() {
																$(this)
																		.dialog(
																				"close");
															}
														} ]

											});
						});

		// addhandler for click on extension column
		$('#df_search_results .df_extension_id')
				.click(
						function(e2) {
							var id = $(e2.currentTarget).attr("ext_id");
							var url = wgServer
									+ wgScriptPath
									+ "/deployment/tools/webadmin/index.php?rs=getDeployDescriptor&rsargs[]="
									+ encodeURIComponent(id);
							var $dialog = $('#df_extension_details')
									.dialog(
											{
												autoOpen : false,
												title : dfgWebAdminLanguage
														.getMessage('df_webadmin_extension_details'),
												modal : true,
												width : 800,
												height : 500
											});
							$dialog.html("<div></div>");
							$dialog.dialog('open');
							$dialog.html('<img src="skins/ajax-loader.gif"/>');
							$
									.ajax( {
										url : url,
										dataType : "json",
										complete : $.webAdmin.operations.extensionsDetailsStarted
									});
						});

		// addhandler for click on version column
		$('#df_search_results .df_version')
				.click(
						function(e2) {
							var id = $(e2.currentTarget).attr('extid');
							var version = $(e2.currentTarget).attr('version');
							version = version.split("_")[0]; // remove
							// patchlevel
							var url = wgServer
									+ wgScriptPath
									+ "/deployment/tools/webadmin/index.php?rs=getDeployDescriptor&rsargs[]="
									+ encodeURIComponent(id) + "&rsargs[]="
									+ encodeURIComponent(version);
							var $dialog = $('#df_extension_details')
									.dialog(
											{
												autoOpen : false,
												title : dfgWebAdminLanguage
														.getMessage('df_webadmin_extension_details'),
												modal : true,
												width : 800,
												height : 500
											});
							$dialog.html("<div></div>");
							$dialog.dialog('open');
							$dialog.html('<img src="skins/ajax-loader.gif"/>');
							$
									.ajax( {
										url : url,
										dataType : "json",
										complete : $.webAdmin.operations.extensionsDetailsStarted
									});
						});

		// register handler for selection checkboxes in search results
		// this is for multi-install
		$('.df_checkbox', '#df_search_results').change(function(e) {
			if ($("input:checked", '#df_search_results').length > 0) {
				$('.df_install_all').attr('disabled', false);
			} else {
				$('.df_install_all').attr('disabled', true);
			}
		});

	}
	var searchvalue = $('#df_searchinput').val();
	$('#df_search_progress_indicator').show();
	var url = wgServer + wgScriptPath
			+ "/deployment/tools/webadmin/index.php?rs=search&rsargs[]="
			+ encodeURIComponent(searchvalue);
	$('#df_search_results').load(url, null, callbackHandler);

};

$(document)
		.ready(
				function(e) {

					// register search handler
					$('#df_search').click(function(e) {
						$.webAdmin.operations.searchHandler(e);
					});
					$('#df_searchinput').keypress(function(e) {
						if (e.keyCode == 13) {
							$.webAdmin.operations.searchHandler(e);
						}
					});

					$('.df_install_all')
							.click(
									function(e) {
										$('.df_install_all_progress_indicator').show();
										var selectedExtensionsToInstall = [];
										$("input:checked", '#df_search_results')
												.each(
														function(i, e) {
															var id = $(e).attr(
																	"extid");
															var version = $(e)
																	.attr(
																			"version")
																	.split("_")[0];
															selectedExtensionsToInstall
																	.push(id
																			+ "-"
																			+ version);
														});
										var globalSettings = $
										.toJSON($.webAdmin.settings
												.getSettings());
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=getAllDependencies&rsargs[]="
												+ encodeURIComponent(selectedExtensionsToInstall
														.join(","))+"&rsargs[]="+encodeURIComponent(globalSettings);

										var callbackForExtensions = function(
												xhr, status) {
											$('.df_install_all_progress_indicator').hide();
											if (xhr.responseText
													.indexOf('session: time-out') != -1) {
												alert("Please login again. Session timed-out");
												return;
											}

											var extensionsToInstall = $
													.parseJSON(xhr.responseText);
											var text = "";

											if (extensionsToInstall['exception']) {
												text += extensionsToInstall['exception'][0];
											} else {
												text = dfgWebAdminLanguage
														.getMessage('df_webadmin_wouldbeinstalled');
												text += "<ul>";
												$
														.each(
																extensionsToInstall['extensions'],
																function(index,
																		value) {
																	var id = value[0];
																	var version = value[1];
																	text += "<li>"
																			+ id
																			+ "-"
																			+ version
																			+ "</li>";
																});
												text += "</ul>";
											}

											
											$('#updatedialog-confirm-text')
													.html(text);
											$("#updatedialog-confirm")
													.dialog(
															{
																resizable : false,
																height : 400,
																modal : true,
																buttons : [ {
																	text : dfgWebAdminLanguage
																		.getMessage('df_webadmin_doinstall'),
																	click : function() {
																		$(this)
																				.dialog(
																						"close");
																		var globalSettings = $
																				.toJSON($.webAdmin.settings
																						.getSettings());
																		var url = wgServer
																				+ wgScriptPath
																				+ "/deployment/tools/webadmin/index.php?rs=installAll&rsargs[]="
																				+ encodeURIComponent(selectedExtensionsToInstall
																						.join(","))
																				+ "&rsargs[]="
																				+ encodeURIComponent(globalSettings);

																		var $dialog = $(
																				'#df_install_dialog')
																				.dialog(
																						{
																							autoOpen : false,
																							title : dfgWebAdminLanguage
																									.getMessage('df_webadmin_pleasewait'),
																							modal : true,
																							width : 800,
																							height : 500,
																							operation : "install",
																							close : function(
																									event,
																									ui) {
																								window.location.href = wgServer
																										+ wgScriptPath
																										+ "/deployment/tools/webadmin/index.php?tab=0";

																							}
																						});
																		$dialog
																				.html("<div></div>");

																		$dialog
																				.dialog('open');
																		$dialog
																				.html('<img src="skins/ajax-loader.gif"/>');
																		$(
																				'.ui-dialog-titlebar-close')
																				.hide();
																		$
																				.ajax( {
																					url : url,
																					dataType : "json",
																					complete : $.webAdmin.operations.installStarted
																				});
																	}
																},
																{
																	text : dfgWebAdminLanguage
																			.getMessage('df_webadmin_cancel'),
																	click : function() {
																		$(this)
																				.dialog(
																						"close");
																	}
																}  ]

															});

										}
										$.ajax( {
											url : url,
											dataType : "json",
											complete : callbackForExtensions
										});

									});

				});/*
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
 * @file
 * @ingroup WebAdmin
 *
 * webadmin scripts for DF_ServersTab
 * 	
 * @author: Kai Kühn
 *
 */
$(document)
		.ready(
				function(e) {
					// register process polling
					if (dfgOS != 'Windows XP') {
						var timer;
						var periodicProcessPoll = function() {
							if (timer)
								clearTimeout(timer);
							timer = setTimeout(periodicProcessPoll, 20000);

							var servers = [ "apache", "mysql", "solr", "tsc",
									"memcached" ];
							var commands = [];
							$(servers).each(
									function() {
										commands.push($(
												'#df_servers_' + this
														+ '_command').val());
									});
							var url = wgServer
									+ wgScriptPath
									+ "/deployment/tools/webadmin/index.php?rs=areServicesRunning&rsargs[]="
									+ servers.join(",") + "&rsargs[]="
									+ encodeURIComponent(commands.join(","));
							var updateProcessDisplay = function(xhr, status) {

								var result = xhr.responseText.split(",");
								var i = 0;
								$(result)
										.each(
												function(index, s) {
													var flag = $('#df_run_flag_'
															+ servers[i]);
													if (s == "1") {
														flag.text("running");
														flag
																.addClass('df_running_process');
														flag
																.removeClass('df_not_running_process');
													} else {
														flag
																.text("not running")
														flag
																.addClass('df_not_running_process');
														flag
																.removeClass('df_running_process');
													}
													i++;
												});

							};
							$.ajax( {
								url : url,
								dataType : "json",
								complete : updateProcessDisplay,
								timeout : 10000
							});
						}
						setTimeout(periodicProcessPoll, 20000);
					}

					// server command change listener
					$('.df_servers_command').change(
							function(e) {
								var process = $(e.currentTarget).attr('id')
										.split("_")[2];
								var runCommand = $(
										'#df_servers_' + process + '_command')
										.val();
								var selectedId = $("#" + process
										+ "_selector option:selected");
								selectedId.attr("value", runCommand);
								$('#df_servers_save_settings').attr('disabled',
										false);
							});

					// show selected server command
					$('.df_action_selector').change(
							function(e) {
								var process = $(e.currentTarget).attr('id')
										.split("_")[0];
								var selectedId = $("#" + process
										+ "_selector option:selected");
								var runCommand = selectedId.attr("value");
								$('#df_servers_' + process + '_command').val(
										runCommand);
							});

					// load current server command settings
					var loadServerSettings = function(xhr, status) {
						if (xhr.responseText.indexOf('session: time-out') != -1) {
							alert("Please login again. Session timed-out");
							return;
						}
						var result = xhr.responseText;
						if (result == "false")
							return;
						var settings = $.parseJSON(result);
						for (id in settings) {
							var selector = $('#' + id);
							var values = settings[id];
							var startAction = selector[0].firstChild;
							var endAction = startAction.nextSibling;
							$(startAction).attr("value", values[0]);
							if (values.length > 1)
								$(endAction).attr("value", values[1]);

							// set start command
							var process = id.split("_")[0];
							$('#df_servers_' + process + '_command').val(
									values[0]);
						}
					};
					var url = wgServer
							+ wgScriptPath
							+ "/deployment/tools/webadmin/index.php?rs=loadServerSettings&rsargs[]=";
					$.ajax( {
						url : url,
						dataType : "json",
						complete : loadServerSettings
					});

					// save current server command settings
					$('#df_servers_save_settings')
							.click(
									function(e2) {
										var storeServerSettingsExecuted = function(
												xhr, status) {
											if (xhr.responseText
													.indexOf('session: time-out') != -1) {
												alert("Please login again. Session timed-out");
												return;
											}
											var result = xhr.responseText;
											if (result == "true") {
												alert("Server settings are saved!");
											} else {
												alert("Error on saving server settings")
											}
										}
										var settings = {};
										$('.df_action_selector')
												.each(
														function(index, e) {
															var startAction = e.firstChild;
															var endAction = startAction.nextSibling;
															settings[$(e).attr(
																	"id")] = [
																	$(
																			startAction)
																			.attr(
																					"value"),
																	$(endAction)
																			.attr(
																					"value") ];
														});
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=storeServerSettings&rsargs[]="
												+ encodeURIComponent($
														.toJSON(settings));
										$
												.ajax( {
													url : url,
													dataType : "json",
													complete : storeServerSettingsExecuted
												});
										$('#df_servers_save_settings').attr(
												'disabled', true);
									});

					// execute server command button
					var executeCommand = function(e) {
						var commandExecuted = function(xhr, status) {
							if (xhr.responseText.indexOf('session: time-out') != -1) {
								alert("Please login again. Session timed-out");
								return;
							}
							$(e.currentTarget).attr('disabled', false);
						};
						var process = $(e.currentTarget).attr('id').split("_")[2];
						var runCommand = $(
								'#df_servers_' + process + '_command').val();
						var operation = $(
								'#' + process + "_selector option:selected")
								.text();
						var url = wgServer
								+ wgScriptPath
								+ "/deployment/tools/webadmin/index.php?rs=startProcess&rsargs[]="
								+ encodeURIComponent(runCommand) + "&rsargs[]="
								+ operation;
						$.ajax( {
							url : url,
							dataType : "json",
							complete : commandExecuted
						});
						$(e.currentTarget).attr('disabled', true);
					};
					$('.df_servers_execute').click(executeCommand);
				});/*
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
 * @file
 * @ingroup WebAdmin
 * 
 * webadmin scripts for DF_SettingsTab
 * 
 * @author: Kai Kühn
 * 
 */
$(document).ready(function(e) {
	
	$.webAdmin.settings = {};
	$.webAdmin.settings.getSettings = function() {
		var settings = getSettingsFromCookie(document.cookie);
		return $.extend(settings_defaults, settings);
	}
	
	// default settings of WAT options
	var settings_defaults = { 
			df_watsettings_overwrite_always : true,
			df_watsettings_merge_with_other_bundle : true,
			df_watsettings_install_optionals : false,
			df_watsettings_deinstall_dependant : false,
			df_watsettings_apply_patches : true,
			df_watsettings_create_restorepoints: false,
			df_watsettings_hidden_annotations : true,
			df_watsettings_use_namespaces : true 
	};
	
	/**
	 * Applies the settings with the values given from a cookie string.
	 * 
	 * @param object with key-value pairs
	 */
	var applySettings = function(settings) {
		var cookies = [];
		for(id in settings) {
			var value = $.trim(settings[id]);
			$("#"+id).attr("checked", value == "true");
		}
	}
	
	/**
	 * Returns object with key value pairs from the given cookie.
	 * 
	 * @param string cookie 
	 * 
	 * @return object
	 */
	var getSettingsFromCookie = function(cookie) {
		var settings = "";
		var all_settings = cookie.split(";");
		$.grep(all_settings, function(e) { 
			if (e.substr(0, 12) == 'df_settings=') {
				settings = e.substr(12);
			}
		});
		var result = {};
		var dfSettingsArray = settings.split(",");
		$(dfSettingsArray).each(function(i, e) { 
			var keyValue = e.split("=");
			var id = $.trim(keyValue[0]);
			var value = $.trim(keyValue[1]) == "true";
			result[id] = value;
		});
		return result;
	}
	
	/**
	 * Serializes the object with as key-value pairs
	 * 
	 * key1=value1,key2=value2,...
	 * 
	 * @param object with key-value pairs
	 * 
	 * @return string
	 */
	var serializeSettings = function(settings) {
		var result=[];
		for(var s in settings) {
			var value = settings[s] ? "true" : "false";
			result.push(s+"="+value);
		}
		return result.join(",");
	}

	// expiration date in 30 days from now on
	var expirationDate = new Date();
	var thirtyDays = expirationDate.getTime() + (30 * 24 * 60 * 60 * 1000);
	expirationDate.setTime(thirtyDays);
		
	// read cookie and apply the settings 
	var cookie = document.cookie;
	if (cookie) {
		var settings = getSettingsFromCookie(cookie);
		settings = $.extend(settings_defaults, settings);
		applySettings(settings);
		document.cookie = "df_settings=" + serializeSettings(settings)+"; expires=" + expirationDate.toGMTString();
	} else {
		// no cookies available at all, use defaults
		applySettings(settings_defaults);
	}
	
	// set change listeners
	$('#df_watsettings input').change(function() {
		// update cookie
		var settings = [];
		$('#df_watsettings input').each(function(i, e) { 
			var id = $(e).attr("id");
			var value = e.checked ? "true" : "false";
			settings.push(id+"="+value);
		});
		document.cookie = "df_settings=" + settings.join(",")+"; expires=" + expirationDate.toGMTString();
	});
	
	// reset defaults button
	$('#df_resetdefault_settings').click(function() { 
		applySettings(settings_defaults);
		document.cookie = "df_settings=" + serializeSettings(settings)+"; expires=" + expirationDate.toGMTString();
	});
});/*
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
 * @file
 * @ingroup WebAdmin
 * 
 * webadmin scripts for DF_StatusTab
 * 
 * @author: Kai Kühn
 * 
 */
$(document)
		.ready(
				function(e) {

					// refresh button
					$('#df_refresh_status')
							.click(
									function(e2) {
										window.location.href = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?tab=0";
									});

					// finalize button
					$('#df_run_finalize')
							.click(
									function(e2) {
										// start finalize
										var $dialog = $('#df_install_dialog')
												.dialog(
														{
															autoOpen : false,
															title : dfgWebAdminLanguage
																	.getMessage('df_webadmin_pleasewait'),
															modal : true,
															width : 800,
															height : 500,
															operation : "finalize",
															close : function(
																	event, ui) {
																window.location.href = wgServer
																		+ wgScriptPath
																		+ "/deployment/tools/webadmin/index.php?tab=0";

															}
														});
										$dialog.html("<div></div>");
										$dialog.dialog('open');
										$dialog
												.html('<img src="skins/ajax-loader.gif"/>');
										$('.ui-dialog-titlebar-close').hide();
										var globalSettings = $
												.toJSON($.webAdmin.settings
														.getSettings());
										var finalizeurl = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=finalize&rsargs[]=&rsargs[]="
												+ encodeURIComponent(globalSettings);
										$.ajax( {
											url : finalizeurl,
											dataType : "json",
											complete : function(xhr, status) {
												$dialog.html('');
												$.webAdmin.operations
														.finalizeStarted(xhr,
																status);
											}
										});

									});

					// add about link
					$('#df_webadmin_aboutlink')
							.click(
									function(e2) {
										var $dialog = $(
												'#df_webadmin_about_dialog')
												.dialog(
														{
															autoOpen : false,
															title : dfgWebAdminLanguage
																	.getMessage('df_webadmin_about_title'),
															modal : true,
															width : 350,
															height : 250
														});
										var parts = dfgVersion.split(" ");
										var text = dfgWebAdminLanguage
												.getMessage('df_webadmin_about_desc');
										text += "<br/><br/>Version: "
												+ parts[0];
										text += "<br/>Build: " + parts[1];
										$dialog.html("<div>" + text + "</div>");
										$dialog.dialog('open');
									});

					// register every extension in status view for showing
					// extension details on a click event.
					$('.df_extension_id')
							.click(
									function(e2) {
										var id = $(e2.currentTarget).attr(
												"ext_id");
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=getLocalDeployDescriptor&rsargs[]="
												+ encodeURIComponent(id);
										var $dialog = $('#df_extension_details')
												.dialog(
														{
															autoOpen : false,
															title : dfgWebAdminLanguage
																	.getMessage('df_webadmin_extension_details'),
															modal : true,
															width : 800,
															height : 500
														});
										$dialog.html("<div></div>");
										$dialog.dialog('open');
										$dialog
												.html('<img src="skins/ajax-loader.gif"/>');
										$
												.ajax( {
													url : url,
													dataType : "json",
													complete : $.webAdmin.operations.extensionsDetailsStarted
												});
									});

					// register de-install buttons
					$('.df_deinstall_button')
							.click(
									function(e2) {
										var id = $(e2.currentTarget).attr('id');
										id = id.split("__")[1];

										var deInstallConfirmDialog = $("#deinstall-dialog-confirm")
												.dialog(
														{
															resizable : false,
															height : 350,
															width : 600,
															modal : true,
															

														});
										deInstallConfirmDialog.html('<img src="skins/ajax-loader.gif"/>');
										var globalSettings = $
												.toJSON($.webAdmin.settings
														.getSettings());
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=getDeletionOrder&rsargs[]="
												+ encodeURIComponent(id)
												+ "&rsargs[]="
												+ encodeURIComponent(globalSettings);
										$
												.ajax( {
													url : url,
													dataType : "json",
													complete : function(xhr,
															status) {
														var extensionsToDeInstall = $
																.parseJSON(xhr.responseText);

														if ($.webAdmin.settings
																.getSettings().df_watsettings_deinstall_dependant === false) {
															if (extensionsToDeInstall.length > 1) {
																deInstallConfirmDialog.html(dfgWebAdminLanguage
																		.getMessage('df_webadmin_deinstall_not_possible'));
																return;
															}
														}
														deInstallConfirmDialog.dialog("option", "buttons", {
															"Yes" : {
																	text : dfgWebAdminLanguage
																			.getMessage('df_yes'),
																	click : function() {
																		$(
																				this)
																				.dialog(
																						"close");
																		var globalSettings = $
																				.toJSON($.webAdmin.settings
																						.getSettings());
																		var url = wgServer
																				+ wgScriptPath
																				+ "/deployment/tools/webadmin/index.php?rs=deinstall&rsargs[]="
																				+ encodeURIComponent(id)
																				+ "&rsargs[]="
																				+ encodeURIComponent(globalSettings);
																		var $dialog = $(
																				'#df_install_dialog')
																				.dialog(
																						{
																							autoOpen : false,
																							title : dfgWebAdminLanguage
																									.getMessage('df_webadmin_pleasewait'),
																							modal : true,
																							width : 800,
																							height : 500,
																							operation : "deinstall",
																							close : function(
																									event,
																									ui) {
																								window.location.href = wgServer
																										+ wgScriptPath
																										+ "/deployment/tools/webadmin/index.php?tab=0";

																							}
																						});
																		$dialog
																				.html("<div></div>");
																		$dialog
																				.dialog('open');
																		$dialog
																				.html('<img src="skins/ajax-loader.gif"/>');
																		$(
																				'.ui-dialog-titlebar-close')
																				.hide();
																		$
																				.ajax( {
																					url : url,
																					dataType : "json",
																					complete : $.webAdmin.operations.deinstallStarted
																				});
																	}
																},
																"No": {
																	text : dfgWebAdminLanguage
																			.getMessage('df_no'),
																	click : function() {
																		$(
																				this)
																				.dialog(
																						"close");
																	}
																}
														
														});
														var text = dfgWebAdminLanguage
																.getMessage('df_webadmin_want_touninstall');
														text += "<ul>";
														$
																.each(
																		extensionsToDeInstall,
																		function(
																				i,
																				e) {
																			text += "<ul><li>"
																					+ e
																					+ "</li></ul>";

																		});
														text += "</ul>";
														deInstallConfirmDialog.html(text);

													}
												});

									});

					// register update buttons
					$('.df_update_button')
							.click(
									function(e2) {
										var idAttr = $(e2.currentTarget).attr(
												'id');
										var parts = idAttr.split("__");
										var id = parts[1];
										var version = parts[2].split("_")[0];
										var patchlevel = parts[2].split("_")[1];
										var dialogText = dfgWebAdminLanguage
												.getMessage('df_webadmin_wouldbeupdated')
										$('#updatedialog-confirm-text').html(
												dialogText + "<ul><li>" + id
														+ "-" + version + "_"
														+ patchlevel
														+ "</li></ul>");
										$("#updatedialog-confirm")
												.dialog(
														{
															resizable : false,
															height : 350,
															modal : true,
															buttons : [
																	{
																		text : dfgWebAdminLanguage
																				.getMessage('df_webadmin_doupdate'),
																		click : function() {
																			$(
																					this)
																					.dialog(
																							"close");

																			var globalSettings = $
																					.toJSON($.webAdmin.settings
																							.getSettings());
																			var url = wgServer
																					+ wgScriptPath
																					+ "/deployment/tools/webadmin/index.php?rs=update&rsargs[]="
																					+ encodeURIComponent(id
																							+ "-"
																							+ version)
																					+ "&rsargs[]="
																					+ encodeURIComponent(globalSettings);
																			var $dialog = $(
																					'#df_install_dialog')
																					.dialog(
																							{
																								autoOpen : false,
																								title : dfgWebAdminLanguage
																										.getMessage('df_webadmin_pleasewait'),
																								modal : true,
																								width : 800,
																								height : 500,
																								operation : "update",
																								close : function(
																										event,
																										ui) {
																									window.location.href = wgServer
																											+ wgScriptPath
																											+ "/deployment/tools/webadmin/index.php?tab=0";

																								}
																							});
																			$dialog
																					.html("<div></div>");
																			$dialog
																					.dialog('open');
																			$dialog
																					.html('<img src="skins/ajax-loader.gif"/>');
																			$(
																					'.ui-dialog-titlebar-close')
																					.hide();
																			$
																					.ajax( {
																						url : url,
																						dataType : "json",
																						complete : $.webAdmin.operations.updateStarted
																					});
																		}
																	},
																	{
																		text : dfgWebAdminLanguage
																				.getMessage('df_webadmin_cancel'),
																		click : function() {
																			$(
																					this)
																					.dialog(
																							"close");
																		}
																	} ]

														});
									});

					// register global update button
					$('#df_global_update')
							.click(
									function(e2) {

										var checkforGlobalUpdate = function(
												xhr, status) {
											if (xhr.responseText
													.indexOf('session: time-out') != -1) {
												alert("Please login again. Session timed-out");
												return;
											}
											$('#df_gu_progress_indicator')
													.hide();
											var extensionsToInstall = $
													.parseJSON(xhr.responseText);

											var text = "";
											if (extensionsToInstall['extensions']) {
												text = dfgWebAdminLanguage
														.getMessage('df_webadmin_wouldbeupdated');
												text += "<ul>";
												$
														.each(
																extensionsToInstall['extensions'],
																function(index,
																		value) {
																	text += "<li>"
																			+ value[0]
																			+ "-"
																			+ value[1]
																			+ "_"
																			+ value[2]
																			+ "</li>";
																});
												text += "</ul>";
											}
											if (extensionsToInstall['exception']) {
												text += extensionsToInstall['exception'][0];
											}

											$(
													'#global-updatedialog-confirm-text')
													.html(text);

											$("#global-updatedialog-confirm")
													.dialog(
															{
																resizable : false,
																height : 350,
																modal : true,
																buttons : []

															});
											
											// show button if there are no exceptions
											if (!extensionsToInstall['exception']) {
												$("#global-updatedialog-confirm").dialog("option", "buttons", {
													doupdate: {
														text : dfgWebAdminLanguage
																.getMessage('df_webadmin_doupdate'),
														click : function() {
															$(
																	this)
																	.dialog(
																			"close");
															var globalSettings = $
																	.toJSON($.webAdmin.settings
																			.getSettings());
															var url = wgServer
																	+ wgScriptPath
																	+ "/deployment/tools/webadmin/index.php?rs=doGlobalUpdate"
																	+ "&rsargs[]="
																	+ encodeURIComponent(globalSettings);
															var $dialog = $(
																	'#df_install_dialog')
																	.dialog(
																			{
																				autoOpen : false,
																				title : dfgWebAdminLanguage
																						.getMessage('df_webadmin_pleasewait'),
																				modal : true,
																				width : 800,
																				height : 500,
																				operation : "update",
																				close : function(
																						event,
																						ui) {
																					window.location.href = wgServer
																							+ wgScriptPath
																							+ "/deployment/tools/webadmin/index.php?tab=0";

																				}
																			});
															$dialog
																	.html("<div></div>");
															$dialog
																	.dialog('open');
															$dialog
																	.html('<img src="skins/ajax-loader.gif"/>');
															$(
																	'.ui-dialog-titlebar-close')
																	.hide();
															
															$
																	.ajax( {
																		url : url,
																		dataType : "json",
																		complete : $.webAdmin.operations.globalUpdateStarted
																	});
														}
													}, cancel:	{
														text : dfgWebAdminLanguage
																.getMessage('df_webadmin_cancel'),
														click : function() {
															$(
																	this)
																	.dialog(
																			"close");
														}
													}
												});
											}
										}
										$('#df_gu_progress_indicator').show();
										var globalSettings = $
										.toJSON($.webAdmin.settings
												.getSettings());
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=checkforGlobalUpdate&rsargs[]="
												+ encodeURIComponent(globalSettings);
										$.ajax( {
											url : url,
											dataType : "json",
											complete : checkforGlobalUpdate
										});
									});
				});/*
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
 * @file
 * @ingroup WebAdmin
 *
 * webadmin scripts for DF_UploadTab
 * 	
 * @author: Kai Kühn
 *
 */
$(document)
		.ready(
				function(e) {
					// upload input field
					$('#df_upload_file_input').change(function(e) {
						$('#df_upload_progress_indicator').show();
						$('#df_upload_file_form').submit();
					});

					// register install file button
					$('.df_installfile_button')
							.click(
									function(e2) {
										var filepath = $(e2.currentTarget)
												.attr('loc');
										var globalSettings = $
										.toJSON($.webAdmin.settings
												.getSettings());
										
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=install&rsargs[]="
												+ encodeURIComponent(filepath)
												+ "&rsargs[]="
												+ encodeURIComponent(globalSettings);
										
										var $dialog = $('#df_install_dialog')
												.dialog(
														{
															autoOpen : false,
															title : dfgWebAdminLanguage
																	.getMessage('df_webadmin_pleasewait'),
															modal : true,
															width : 800,
															height : 500,
															operation : "install",
															close : function(
																	event, ui) {
																window.location.href = wgServer
																		+ wgScriptPath
																		+ "/deployment/tools/webadmin/index.php?tab=0";

															}
														});
										$dialog.html("<div></div>");
										$dialog.dialog('open');
										$dialog
												.html('<img src="skins/ajax-loader.gif"/>');
										$('.ui-dialog-titlebar-close').hide();
										$
												.ajax( {
													url : url,
													dataType : "json",
													complete : $.webAdmin.operations.installStarted
												});
									});

					// register remove file button
					$('.df_removefile_button')
							.click(
									function(e2) {
										var filepath = $(e2.currentTarget)
												.attr('loc');
										$(e2.currentTarget).parent().parent()
												.remove();
										var url = wgServer
												+ wgScriptPath
												+ "/deployment/tools/webadmin/index.php?rs=removeFile&rsargs[]="
												+ encodeURIComponent(filepath);

										$.ajax( {
											url : url,
											dataType : "json"
										});
									});
				});