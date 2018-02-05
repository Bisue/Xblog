/**
 * @author lufficc
 */

require('./boot');

(function ($) {
    let Xblog = {
        init: function () {
            this.bootUp();
            $('[data-toggle="tooltip"]').tooltip();
        },
        bootUp: function () {
            initComment();
            initMarkdownTarget();
            initTables();
            autoSize();
            initProjects();
            initDeleteTarget();
            clipboardCodeSnippets();
            highLightCode();
        },
    };

    function clipboardCodeSnippets() {
        let snippets = document.querySelectorAll('pre');
        [].forEach.call(snippets, function (snippet) {
            snippet.firstChild.insertAdjacentHTML('beforebegin', '<button class="clipboard-target btn">Copy</button >');
        });
        let clipboardSnippets = new Clipboard('.clipboard-target', {
            target: function (trigger) {
                return trigger.nextElementSibling;
            }
        });
        clipboardSnippets.on('success', function (e) {
            e.clearSelection();
            showTooltip(e.trigger, 'Copied!')
        });
        clipboardSnippets.on('error', function (e) {
            showTooltip(e.trigger, 'Copy failed!')
        });

        function showTooltip(target, title) {
            $(target).tooltip({placement: 'left', trigger: 'manual'}).tooltip('hide')
                .attr('data-original-title', title)
                .tooltip('show');
            $(target).mouseleave(function (e) {
                $(e.currentTarget).tooltip('hide');
                $(e.currentTarget).blur();
            })
        }
    }

    function initDeleteTarget() {

        $('.swal-dialog-target').each(function () {
            if ($(this).attr('appended-form') == '1') {
                return
            }
            $(this).attr('appended-form', '1');
            $(this).append(function () {
                return "\n" +
                    "<form action='" + $(this).attr('data-url') + "' method='post' style='display:none'>\n" +
                    "   <input type='hidden' name='_method' value='" + ($(this).data('method') ? $(this).data('method') : 'delete') + "'>\n" +
                    "   <input type='hidden' name='_token' value='" + XblogConfig.csrfToken + "'>\n" +
                    "</form>\n"
            }).click(function () {
                let deleteForm = $(this).find("form");
                let method = ($(this).data('method') ? $(this).data('method') : 'delete');
                let url = $(this).attr('data-url');
                let data = $(this).data('request-data') ? $(this).data('request-data') : '';
                let title = $(this).data('dialog-title') ? $(this).data('dialog-title') : '删除';
                let message = $(this).data('dialog-msg');
                let type = $(this).data('dialog-type') ? $(this).data('dialog-type') : 'danger';
                let cancel_text = $(this).data('dialog-cancel-text') ? $(this).data('dialog-cancel-text') : '取消';
                let confirm_text = $(this).data('dialog-confirm-text') ? $(this).data('dialog-confirm-text') : '确定';
                console.log(data);
                dialog({
                        title: title,
                        body: message,
                        type: type,
                        cancel: cancel_text,
                        confirm: confirm_text
                    },
                    function () {
                        deleteForm.submit();
                    });
            });

        });
    }


    function initComment() {
        $('.comment-form').each(function () {
            bindCommentFrom($(this));
        });
    }

    function bindCommentFrom(form) {
        let submitBtn = form.find('#comment-submit');
        let commentContent = form.find('#comment-content');

        let username = form.find('input[name=username]');
        let email = form.find('input[name=email]');
        let site = form.find('input[name=site]');
        let captcha = form.find('input[name=captcha]');

        if (window.localStorage) {
            username.val(localStorage.getItem('comment_username') === undefined ? '' : localStorage.getItem('comment_username'));
            email.val(localStorage.getItem('comment_email') === undefined ? '' : localStorage.getItem('comment_email'));
            site.val(localStorage.getItem('comment_site') === undefined ? '' : localStorage.getItem('comment_site'));
        }

        form.on('submit', function () {
            if (username.length > 0) {
                if ($.trim(username.val()) === '') {
                    username.focus();
                    return false;
                }
                else if ($.trim(email.val()) === '') {
                    email.focus();
                    return false;
                }
            }

            if ($.trim(commentContent.val()) === '') {
                commentContent.focus();
                return false;
            }
            if ($.trim(captcha.val()) === '') {
                captcha.focus();
                return false;
            }

            let usernameValue = username.val();
            let emailValue = email.val();
            let siteValue = site.val();

            submitBtn.val('提交中...').addClass('disabled').prop('disabled', true);
            form.find('#comment_submit_msg').text('').hide();
            $.ajax({
                method: 'post',
                url: $(this).attr('action'),
                headers: {
                    'X-CSRF-TOKEN': XblogConfig.csrfToken
                },
                data: form.serialize(),
            }).done(function (data) {
                if (data.status === 200) {
                    if (window.localStorage) {
                        localStorage.setItem('comment_username', usernameValue);
                        localStorage.setItem('comment_email', emailValue);
                        localStorage.setItem('comment_site', siteValue);
                    }
                    username.val('');
                    email.val('');
                    site.val('');
                    captcha.val('');
                    commentContent.val('');
                    form.find('#comment_submit_msg').hide();
                    if (data.comment.reply_id) {
                        $('#comment-' + data.comment.reply_id + ' > .comment-info > .comment-content').append(data.rendered_html);
                    } else {
                        $('#comments-container').append(data.rendered_html);
                    }
                    initDeleteTarget();
                    highLightCodeOfChild($('#comments-container'));
                    if ($('#comment-' + data.comment.id).length > 0) {
                        setTimeout(function () {
                            $.smoothScroll({
                                scrollTarget: '#comment-' + data.comment.id,
                                autoFocus: true
                            });
                        }, 500)
                    }
                    form.find('#comment_submit_msg').attr('class', 'text-success').text('Thanks for your comment! It will show on the site once it has been approve.');
                } else {
                    form.find('#comment_submit_msg').attr('class', 'text-danger').text(data.msg);
                }
                form.find('#comment_submit_msg').show();
            }).fail(function () {
                form.find('#comment_submit_msg').attr('class', 'text-danger').text('Internal Server Error.');
                form.find('#comment_submit_msg').show();
            }).always(function () {
                submitBtn.val("回复").removeClass('disabled').prop('disabled', false);
                form.find('#captcha').attr('src', '/captcha/' + XblogConfig.captcha_config + '?' + Math.random());
            });
            return false;
        });
    }

    function initMarkdownTarget() {
        $('.markdown-target').each(function (i, element) {
            element.innerHTML =
                marked($(element).data("markdown"), {
                    renderer: new marked.Renderer(),
                    gfm: true,
                    tables: true,
                    breaks: false,
                    pedantic: false,
                    smartLists: true,
                    smartypants: false,
                });
        });
    }

    function highLightCode() {
        $('pre code').each(function (i, block) {
            hljs.highlightBlock(block);
        });
    }

    function highLightCodeOfChild(parent) {
        $('pre code', parent).each(function (i, block) {
            hljs.highlightBlock(block);
        });
    }

    function initTables() {
        $('.post-detail-content table').addClass('table table-striped table-responsive');
    }

    function autoSize() {
        autosize($('.autosize-target'));
    }

    function initProjects() {
        let projects = $('.projects');
        if (projects.length > 0) {
            $.get('https://api.github.com/users/' + XblogConfig.github_username + '/repos?type=owner',
                function (repositories) {
                    if (!repositories) {
                        projects.html('<div><h3>加载失败</h3><p>请刷新或稍后再试...</p></div>');
                        return;
                    }
                    projects.html('');
                    repositories = repositories.sort(function (repo1, repo2) {
                        return repo2.stargazers_count - repo1.stargazers_count;
                    });
                    repositories = repositories.filter(function (repo) {
                        return repo.description != null;
                    });
                    repositories.forEach(function (repo) {
                        let repoTemplate = $('#repo-template').html();
                        let item = repoTemplate.replace(/\[(.*?)\]/g, function () {
                            return eval(arguments[1]);
                        });
                        projects.append(item)
                    });
                    projects.attr('data-masonry', '{ "itemSelector": ".col", "columnWidth":".col" }');
                    projects.masonry();
                });
        }
    }

    Xblog.bindCommentFrom = bindCommentFrom;
    window.Xblog = Xblog;
})(jQuery);
$(document).ready(function () {
    Xblog.init();
});
