import Ajv, { Schema } from 'ajv';
import addFormats from 'ajv-formats';
import type {
    IDataObject,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

export class JsonValidationNode implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'JSON Validation',
        name: 'jsonValidationNode',
        group: ['transform'],
        version: 1,
        description: 'JSON Validation',
        defaults: {
            name: 'JSON Validation',
        },
        icon: 'file:jv.svg',
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        usableAsTool: true,
        properties: [
            {
                displayName: 'Input JSON',
                name: 'value',
                type: 'json',
                default: '',
                required: true,
                placeholder: '{}',
                description: 'JSON value to validate',
            },
            {
                displayName: 'JSON Schema',
                name: 'schema',
                type: 'json',
                required: true,
                default: '',
                placeholder: '{}',
                description: 'JSON Schema to validate against',
            },
            {
                displayName: 'Return All Errors',
                name: 'returnAllErrors',
                type: 'boolean',
                default: false,
                description:
                    'Whether to return all validation errors or only the first one',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const value = this.getNodeParameter('value', 0) as string;
        const schema = this.getNodeParameter('schema', 0) as string;
        const returnAllErrors = this.getNodeParameter('returnAllErrors', 0) as boolean;

        let jsonSchema: Schema;

        try {
            jsonSchema = JSON.parse(schema) as Schema;
        } catch (err) {
            throw new NodeOperationError(
                this.getNode(),
                'Invalid JSON Schema - failed to parse JSON',
            );
        }

        const ajv = new Ajv({ allErrors: returnAllErrors });
        addFormats(ajv);
        let validate: ReturnType<(typeof ajv)['compile']>;

        try {
            validate = ajv.compile(jsonSchema);
        } catch (err) {
            throw new NodeOperationError(
                this.getNode(),
                'Invalid JSON Schema - avj compilation failed',
            );
        }

        let parsedValue: unknown;

        try {
            if (typeof value !== 'string') {
                parsedValue = value;
            }
            parsedValue = JSON.parse(value);
        } catch {
            this.helpers.returnJsonArray([
                {
                    validationErrors: ['Value is not JSON'],
                },
            ]);
        }

        const valid = validate(parsedValue);

        if (valid) {
            return [
                this.helpers.returnJsonArray([
                    {
                        validValue: parsedValue as IDataObject,
                    },
                ]),
            ];
        }

        return [
            this.helpers.returnJsonArray([
                {
                    validationErrors: validate.errors,
                    providedValue: value,
                },
            ]),
        ];
    }
}
