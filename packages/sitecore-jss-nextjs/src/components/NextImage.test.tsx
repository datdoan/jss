/* eslint-disable no-unused-expressions */
import chai, { use } from 'chai';
import chaiString from 'chai-string';
import { mount } from 'enzyme';
import React from 'react';
import { NextImage, loader } from './NextImage';
import { ImageField } from '@sitecore-jss/sitecore-jss-react';
import { ImageLoader, ImageLoaderProps } from 'next/image';
import { spy, match } from 'sinon';
import sinonChai from 'sinon-chai';
import { SinonSpy } from 'sinon';

use(sinonChai);
const expect = chai.use(chaiString).expect;
describe('<NextImage />', () => {
  describe('Next loader function', () => {
    it('should append configPath and query string params when src is relative', () => {
      const params: ImageLoaderProps = {
        config: {
          deviceSizes: [],
          imageSizes: [],
          path: 'https://cm.jss.localhost',
          allSizes: [],
          loader: 'default',
          domains: [],
          disableStaticImages: false,
          minimumCacheTTL: 1,
          formats: [],
          dangerouslyAllowSVG: false,
          contentSecurityPolicy: 'test',
        },
        src: '/assets/img/test0.png',
        width: 100,
      };
      const result = loader(params);
      expect(result).to.be.a('string');
      expect(result).to.equal(`${params.config.path}/assets/img/test0.png?mw=100`);
    });

    it('should not require config path when src is absolute', () => {
      const params: ImageLoaderProps = {
        config: {
          deviceSizes: [],
          imageSizes: [],
          path: undefined,
          allSizes: [],
          loader: 'default',
          domains: [],
          disableStaticImages: false,
          minimumCacheTTL: 1,
          formats: [],
          dangerouslyAllowSVG: false,
          contentSecurityPolicy: 'test',
        },
        src: 'https://cm.jss.localhost/assets/img/test0.png',
        width: 100,
      };
      const result = loader(params);
      expect(result).to.be.a('string');
      expect(result).to.equal('https://cm.jss.localhost/assets/img/test0.png?mw=100');
    });

    it('should not append config path when src is absolute', () => {
      const params: ImageLoaderProps = {
        config: {
          deviceSizes: [],
          imageSizes: [],
          path: 'https://cm.jss.localhost/',
          allSizes: [],
          loader: 'default',
          domains: [],
          disableStaticImages: false,
          minimumCacheTTL: 1,
          formats: [],
          dangerouslyAllowSVG: false,
          contentSecurityPolicy: 'test',
        },
        src: 'https://cm.jss.localhost/assets/img/test0.png',
        width: 100,
      };
      const result = loader(params);
      console.log(result);
      expect(result).to.be.a('string');
      expect(result).to.equal('https://cm.jss.localhost/assets/img/test0.png?mw=100');
    });

    it('should throw an error if path is not configured', () => {
      const params: ImageLoaderProps = {
        config: {
          deviceSizes: [],
          imageSizes: [],
          path: undefined,
          allSizes: [],
          loader: 'default',
          domains: [],
          disableStaticImages: false,
          minimumCacheTTL: 1,
          formats: [],
          dangerouslyAllowSVG: false,
          contentSecurityPolicy: 'test',
        },
        src: '/assets/img/test0.png?mw=100',
        width: 100,
      };
      expect(() => loader(params)).to.throw(
        'Failed to load image. Please make sure images path is configured correctly in next.config.js'
      );
    });
  });

  describe('error cases', () => {
    const src = '/assets/img/test0.png';
    it('should throw an error if src is present', () => {
      expect(() => mount(<NextImage src={src} />)).to.throw(
        'Detected src prop. If you wish to use src, use next/image directly.'
      );
    });
  });

  describe('With loader function passed by the user', () => {
    const userCustomLoader = ({ src }) => new URL(`https://cm.jss.localhost${src}`).href;
    const userMockLoader = (spy(userCustomLoader) as unknown) as ImageLoader;
    const props = {
      field: {
        src: '/assets/img/test0.png',
      },
      width: 8,
      height: 10,
      loader: userMockLoader,
    };

    const rendered = mount(<NextImage {...props} />).find('Image');

    it('should render image with url', () => {
      expect(rendered).to.have.lengthOf(1);
      expect(rendered.prop('src')).to.equal(props.field.src);
      expect(rendered.prop('width')).to.equal(props.width);
      expect(rendered.prop('height')).to.equal(props.height);
      expect(rendered.prop('loader')).to.equal(props.loader);
      expect(userMockLoader).to.have.been.called;
      expect(userMockLoader).to.have.been.calledWith(
        match({ src: props.field.src, width: props.width })
      );
    });
  });
});

describe('Next Loader function', () => {
  type MockLoaderType = ImageLoader extends SinonSpy ? SinonSpy : SinonSpy<any, any>;
  const customLoader = ({ src }) => new URL(`https://cm.jss.localhost${src}`).href;
  const mockLoader = (spy(customLoader) as unknown) as MockLoaderType;
  afterEach(() => {
    () => mockLoader.resetHistory();
  });

  describe('with direct image object, no value/editable', () => {
    const props = {
      field: {
        src: '/assets/img/test0.png',
      },
      width: 8,
      height: 10,
    };

    const rendered = mount(<NextImage loader={mockLoader} {...props} />).find('Image');
    it('should render image with url', () => {
      expect(rendered).to.have.lengthOf(1);
      expect(rendered.prop('src')).to.equal(props.field.src);
      expect(rendered.prop('width')).to.equal(props.width);
      expect(rendered.prop('height')).to.equal(props.height);

      expect(mockLoader.called).to.be.true;
      expect(mockLoader).to.have.been.calledWith(
        match({ src: props.field.src, width: props.width })
      );
    });
  });

  describe('with responsive image object', () => {
    const props = {
      field: { value: { src: '/assets/img/test0.png', alt: 'my image' } },
      layout: 'responsive' as const,
      sizes: '(min-width: 960px) 300px, 100px',
      width: 8,
      height: 10,
      id: 'some-id',
      className: 'the-dude-abides',
    };

    const rendered = mount(<NextImage loader={mockLoader} {...props} />).find('Image');

    it('should render image with needed props', () => {
      expect(rendered).to.have.length(1);
      expect(rendered.prop('src')).to.equal(props.field.value.src);
      expect(rendered.prop('sizes')).to.equal('(min-width: 960px) 300px, 100px');
      expect(rendered.prop('layout')).to.equal(props.layout);
      expect(mockLoader.called).to.be.true;
      expect(mockLoader).to.have.been.calledWith(
        match({ src: props.field.value.src, width: props.width })
      );
    });

    it('should render image with non-media props', () => {
      expect(rendered.prop('id')).to.equal(props.id);
    });

    it('should render image with className prop', () => {
      expect(rendered.prop('className')).to.eql(props.className);
    });
  });

  describe('with "value" property value', () => {
    const props = {
      field: { value: { src: '/assets/img/test0.png', alt: 'my image' } },
      width: 8,
      height: 10,
      id: 'some-id',
      className: 'the-dude-abides',
    };
    const rendered = mount(<NextImage loader={mockLoader} {...props} />).find('Image');

    it('should render image component with "value" properties', () => {
      expect(rendered).to.have.length(1);
      expect(rendered.prop('src')).to.eql(props.field.value.src);
      expect(rendered.prop('alt')).to.eql(props.field.value.alt);
      expect(mockLoader.called).to.be.true;
      expect(mockLoader).to.have.been.calledWith(
        match({ src: props.field.value.src, width: props.width })
      );
    });

    it('should render image with non-media props', () => {
      expect(rendered.prop('id')).to.equal(props.id);
    });

    it('should render image with className prop', () => {
      expect(rendered.prop('className')).to.eql(props.className);
    });
  });

  describe('with "editable" property value but editing disabled', () => {
    const props = {
      field: { value: { src: '/assets/img/test0.png', alt: 'my image' } },
      width: 8,
      height: 10,
      alt: 'my image',
      editable: false,
      className: 'the-dude-abides w-100',
    };
    const rendered = mount(<NextImage loader={mockLoader} {...props} />).find('Image');

    it('should render image component with "value" properties', () => {
      expect(rendered).to.have.length(1);
      expect(rendered.prop('src')).to.eql(props.field.value.src);
      expect(rendered.prop('alt')).to.eql(props.field.value.alt);
      expect(mockLoader.called).to.be.true;
      expect(mockLoader).to.have.been.calledWith(
        match({ src: props.field.value.src, width: props.width })
      );
    });

    it('should render image with className prop', () => {
      expect(rendered.prop('className')).to.eql(props.className);
    });
  });

  describe('with "mediaUrlPrefix" property', () => {
    it('should transform url with "value" property value', () => {
      const props = {
        field: { value: { src: '/~assets/img/test0.png', alt: 'my image' } },
        id: 'some-id',
        width: 100,
        height: 50,
        imageParams: { foo: 'bar' },
        mediaUrlPrefix: /\/([-~]{1})assets\//i,
      };
      const rendered = mount(<NextImage loader={mockLoader} {...props} />);

      expect(rendered.find('Image').prop('src')).to.equal('/~/jssmedia/img/test0.png?foo=bar');
      rendered.setProps({
        ...props,
        field: { src: '/-assets/img/test0.png' },
      });
      expect(rendered.find('Image').prop('src')).to.equal('/-/jssmedia/img/test0.png?foo=bar');
      expect(mockLoader.called).to.be.true;
      expect(mockLoader).to.have.been.calledWith(
        match({ src: '/-/jssmedia/img/test0.png?foo=bar', width: props.width })
      );
    });

    it('should transform url with direct image object, no value/editable', () => {
      const props = {
        field: { value: { src: '/~assets/img/test0.png', alt: 'my image' } },
        width: 8,
        height: 10,
        id: 'some-id',
        imageParams: { foo: 'bar' },
        mediaUrlPrefix: /\/([-~]{1})assets\//i,
      };
      const rendered = mount(<NextImage loader={mockLoader} {...props} />);
      expect(rendered.find('Image').prop('src')).to.equal('/~/jssmedia/img/test0.png?foo=bar');
      rendered.setProps({
        ...props,
        field: { src: '/-assets/img/test0.png' },
        width: 8,
        height: 10,
      });
      expect(rendered.find('Image').prop('src')).to.equal('/-/jssmedia/img/test0.png?foo=bar');
      expect(mockLoader.called).to.be.true;
      expect(mockLoader).to.have.been.calledWith(
        match({ src: '/-/jssmedia/img/test0.png?foo=bar', width: props.width })
      );
    });

    it('should render no image when field prop is empty', () => {
      const img = '' as ImageField;
      const rendered = mount(<NextImage field={img} />).find('Image');
      expect(rendered).to.have.length(0);
    });
  });
});