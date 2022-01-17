import haskell from 'highlight.js/lib/languages/haskell';
import nix from 'highlight.js/lib/languages/nix';
import vim from 'highlight.js/lib/languages/vim';
import type { H, MdastNode } from 'mdast-util-to-hast/lib';
import { toString } from 'mdast-util-to-string';
import { GetStaticPaths, GetStaticProps } from 'next';
import path from 'path';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype, { all } from 'remark-rehype';
import { unified } from 'unified';
import { u } from 'unist-builder';

import { Layout, TableOfContents } from '../../../../../components';
import * as Post from '../../../../../Post';
import { PostRepository } from '../../../../../PostRepository';
import { fancyLinks, slugger } from '../../../../../unified-plugins';

type Props = {
    date: string;
    html: string;
    preface: string;
    preview: string | null;
    sections: Post.TableOfContents.T;
    title: string;
};

const Page: React.FC<Props> = ({ date, html, preface, preview, sections, title }) => {
    return (
        <Layout article={{ date }} title={title} description={preface} preview={preview ?? undefined}>
            <div className="flex justify-center">
                <article
                    className="global-article w-full lg:w-3/4 max-w-screen-lg"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
                <aside className="hidden shrink-0 lg:block w-1/4 pl-4 max-w-sm">
                    <TableOfContents className="sticky top-4" sections={sections} />
                </aside>
            </div>
        </Layout>
    );
};

const getStaticPaths: GetStaticPaths = async () => {
    const posts = await PostRepository.list();

    const paths = posts.map(([year, month, day, filename]) => ({
        params: {
            year,
            month,
            day,
            slug: path.parse(filename).name,
        },
    }));

    return {
        paths,
        fallback: false,
    };
};

const getStaticProps: GetStaticProps<Props> = async (ctx) => {
    const year = ctx.params?.year;
    const month = ctx.params?.month;
    const day = ctx.params?.day;
    const slug = ctx.params?.slug;

    if (
        year === undefined ||
        Array.isArray(year) ||
        month === undefined ||
        Array.isArray(month) ||
        day === undefined ||
        Array.isArray(day) ||
        slug === undefined ||
        Array.isArray(slug)
    ) {
        return {
            notFound: true,
        };
    }

    const { body, preview } = await PostRepository.getByPath([year, month, day, slug]);

    const vfile = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(fancyLinks)
        .use(remarkRehype, {
            handlers: {
                footnoteDefinition: (h: H, node: MdastNode) => {
                    if (node.type !== 'footnoteDefinition') {
                        return;
                    }

                    const child = node.children[0];
                    if (node.children.length !== 1 || child?.type !== 'paragraph') {
                        throw new Error(`A footnote definition can contain the single paragraph.`);
                    }

                    h.footnoteById[node.identifier] = node;

                    const id = node.identifier;

                    return h(node, 'p', { id: `fn-${id}` }, [
                        h(node, 'a', { href: `#fnref-${id}` }, [u('text', `*${id}`)]),
                        u('text', ': '),
                        ...all(h, child),
                    ]);
                },
                footnoteReference: (h: H, node: MdastNode) => {
                    if (node.type !== 'footnoteReference') {
                        return;
                    }

                    const id = node.identifier;

                    return h(node, 'sup', [
                        h(
                            node.position,
                            'a',
                            {
                                ariaDescribedby: `#fn-${id}`,
                                href: `#fn-${id}`,
                                id: `fnref-${id}`,
                                title: toString(h.footnoteById[id]),
                            },
                            [u('text', `*${node.identifier}`)],
                        ),
                    ]);
                },
            },
        })
        .use(rehypeKatex, { strict: true })
        .use(rehypeHighlight, {
            aliases: {
                perl: ['perl6'],
            },
            ignoreMissing: true,
            languages: {
                haskell,
                nix,
                vim,
            },
        })
        .use(slugger)
        .use(rehypeAutolinkHeadings, {
            behavior: 'append',
            properties: {
                className: 'heading-anchor',
            },
            content: {
                type: 'text',
                value: '#',
            },
        })
        .use(rehypeStringify)
        .process(body);

    const html = String(vfile);

    const mdast = unified().use(remarkParse).parse(body);

    const title = Post.Title.extract(mdast);
    const preface = Post.Preface.extract(mdast);

    const tableOfContents = Post.TableOfContents.extract(mdast);

    return {
        props: {
            date: `${year}-${month}-${day}`,
            html,
            preface,
            preview,
            sections: tableOfContents,
            title,
        },
    };
};

export default Page;
export { getStaticPaths, getStaticProps };
