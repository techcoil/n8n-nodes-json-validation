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
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        usableAsTool: true,
        properties: [
            {
                displayName: 'Value',
                name: 'value',
                type: 'json',
                default: '',
                required: true,
                placeholder: '{}',
                description: 'Value to validate',
            },
            {
                displayName: 'Schema',
                name: 'schema',
                type: 'json',
                required: true,
                default: '',
                placeholder: '{}',
                description: 'JSON Schema',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const value = this.getNodeParameter('value', 0) as string;
        const schema = this.getNodeParameter('schema', 0) as string;

        let jsonSchema: Schema;

        try {
            jsonSchema = JSON.parse(schema) as Schema;
        } catch (err) {
            throw new NodeOperationError(
                this.getNode(),
                'Invalid JSON Schema - failed to parse JSON',
            );
        }

        const ajv = new Ajv();
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
