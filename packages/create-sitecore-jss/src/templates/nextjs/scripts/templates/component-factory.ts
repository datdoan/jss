/**
 * Describes a file that represents a component definition
 */
 export interface ComponentFile {
  path: string;
  moduleName: string;
  componentName: string;
}

export interface PackageDefinition {
  name: string;
  components: {
    moduleName: string;
    componentName: string;
  }[];
}

const isLazyLoadingModule = (componentPath: string) => componentPath.includes('.dynamic');

const removeDynamicModuleNameEnding = (moduleName: string) =>
  moduleName.replace(/\.?dynamic$/i, '');

/**
 * Generates the contents of the component factory file using a predefined string template.
 * @param components - the list of component files to include
 * @returns component factory file contents
 */
function generateComponentFactory(components: (PackageDefinition | ComponentFile)[]): string {
  const componentFiles = components.filter(
    (component) => (component as ComponentFile).path
  ) as ComponentFile[];
  const packages = components.filter(
    (component) => (component as PackageDefinition).components
  ) as PackageDefinition[];

  const hasLazyModules = componentFiles.find((component) => isLazyLoadingModule(component.path));

  return `/* eslint-disable */
// Do not edit this file, it is auto-generated at build time!
// See scripts/generate-component-factory.ts to modify the generation of this file.

${hasLazyModules ? "import dynamic from 'next/dynamic'" : ''}

${packages.map((pkg) => {
  const list = pkg.components.map((c) => c.moduleName).join(', ');

  return `import { ${list} } from '${pkg.name}'`;
})}
${componentFiles
  .map((component) => {
    if (isLazyLoadingModule(component.path)) {
      const moduleName = removeDynamicModuleNameEnding(component.moduleName);
      return `const ${moduleName} = {
  module: () => import('${component.path}'),
  element: () => dynamic(${moduleName}.module)
}`;
    }

    return `import * as ${component.moduleName} from '${component.path}';`;
  })
  .join('\n')}

const components = new Map();
${packages.map((p) =>
  p.components.map(
    (component) => `components.set('${component.componentName}', ${component.moduleName})`
  )
)}
${componentFiles
  .map(
    (component) =>
      `components.set('${
        isLazyLoadingModule(component.path)
          ? removeDynamicModuleNameEnding(component.componentName)
          : component.componentName
      }', ${
        isLazyLoadingModule(component.path)
          ? removeDynamicModuleNameEnding(component.moduleName)
          : component.moduleName
      });`
  )
  .join('\n')}

// Next.js 'dynamic' import and JavaScript 'dynamic' import are different.
// Next.js 'dynamic(...)' returns common 'React.ComponentType' while
// 'import('...')' returns 'Promise' that will resolve module.
// componentModule uses 'import(...)' because primary usage of it to get not only 'React Component' (default export) but all named exports.
// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#dynamic_imports
// componentFactory uses 'dynamic(...)' because primary usage of it to render 'React Component' (default export).
// See https://nextjs.org/docs/advanced-features/dynamic-import
// At the end you will have single preloaded script for each lazy loading module.

export function componentModule(componentName: string) {
  const component = components.get(componentName);

  // check that component is lazy loading module
  if (!component?.default && component?.module) {
    // return js dynamic import
    return component.module();
  }

  return component;
}
  
export function componentFactory(componentName: string, exportName?: string) {
  const component = components.get(componentName);

  // check that component should be dynamically imported
  if (component?.element) {
    // return next.js dynamic import
    return component.element();
  }

  if (exportName) {
    return component[exportName];
  }

  return component?.default || component;
}
`;
}

export default generateComponentFactory;
