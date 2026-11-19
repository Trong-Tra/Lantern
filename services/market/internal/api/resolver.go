package api

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require
// here.

// Resolver is the dependency-injection root: every query resolver reads
// through the Source (the Envio indexer's Hasura GraphQL in production,
// fakes in tests).
type Resolver struct {
	source Source
}

// NewResolver wires a data source into the resolver root.
func NewResolver(source Source) *Resolver {
	return &Resolver{source: source}
}

// Trades limit clamps (schema: default 50, max 200). Lives here — the
// non-regenerated file — because gqlgen moves unknown consts out of
// schema.resolvers.go on every `gqlgen generate`.
const (
	defaultTradesLimit = 50 // schema default
	maxTradesLimit     = 200
)
